import { createHmac } from "node:crypto";
import type { AccountRole, AuthUser } from "@/types/invoice";
import { getUserById, incrementUserTokenVersion, type UserAccountRecord } from "@/server/database";

type JwtPayload = {
  sub: string;
  username: string;
  role: AccountRole;
  tv: number;
  iat: number;
  exp: number;
};

const AUTH_COOKIE_NAME = "mcs_auth";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const AUTH_TTL_SECONDS = Number(process.env.AUTH_TTL_SECONDS || 60 * 60 * 8);

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString();
}

function sign(input: string): string {
  return createHmac("sha256", JWT_SECRET).update(input).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function issueAuthToken(user: UserAccountRecord): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    tv: user.tokenVersion,
    iat: now,
    exp: now + AUTH_TTL_SECONDS,
  };

  const encodedHeader = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, tokenSignature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
  if (tokenSignature !== expectedSignature) {
    return null;
  }

  const payload = parseJson<JwtPayload>(fromBase64Url(encodedPayload));
  if (!payload) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return null;
  }

  return payload;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key || rest.length === 0) {
      return cookies;
    }

    cookies[key] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function getTokenFromRequest(req: Request): string | null {
  const cookies = parseCookies(req.headers.get("cookie"));
  if (cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}

export async function authenticateRequest(req: Request): Promise<AuthUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = getUserById(payload.sub);
  if (!user) {
    return null;
  }

  if (user.tokenVersion !== payload.tv || user.role !== payload.role) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export function createAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_TTL_SECONDS}${secure}`;
}

export function clearAuthCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function isWorkflowRole(role: AccountRole): role is "MAKER" | "CHECKER_1" | "CHECKER_2" | "SIGNER" {
  return role === "MAKER" || role === "CHECKER_1" || role === "CHECKER_2" || role === "SIGNER";
}

export function invalidateUserSessions(userId: string): void {
  incrementUserTokenVersion(userId);
}
