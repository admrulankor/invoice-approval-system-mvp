import { serve } from "bun";
import index from "./index.html";
import {
  initializeDatabase,
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  updateInvoiceStatus,
  updateInvoiceData,
  getInvoicesByRole,
  createUserAccount,
  getUserByUsername,
  getUserCount,
  listUsers,
  updateUserPassword,
} from "@/server/database";
import { AccountRole, InvoiceStatus, UserRole } from "@/types/invoice";
import { validateInvoice } from "@/utils/invoiceValidation";
import {
  authenticateRequest,
  clearAuthCookie,
  createAuthCookie,
  hashPassword,
  invalidateUserSessions,
  isWorkflowRole,
  issueAuthToken,
  verifyPassword,
} from "@/server/auth";

// Initialize database on startup
initializeDatabase();

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function ensureBootstrapAccounts() {
  if (getUserCount() > 0) {
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "ChangeMe@123";

  const admin = createUserAccount({
    username: process.env.ADMIN_USERNAME || "admin",
    passwordHash: await hashPassword(adminPassword),
    role: "ADMIN",
  });

  const defaultRoles: Array<{ username: string; role: AccountRole }> = [
    { username: "maker", role: UserRole.MAKER },
    { username: "checker1", role: UserRole.CHECKER_1 },
    { username: "checker2", role: UserRole.CHECKER_2 },
    { username: "signer", role: UserRole.SIGNER },
  ];

  for (const account of defaultRoles) {
    createUserAccount({
      username: account.username,
      passwordHash: await hashPassword(defaultPassword),
      role: account.role,
      createdBy: admin.id,
    });
  }

  console.log("Bootstrap accounts created:");
  console.log(`- admin / ${adminPassword}`);
  console.log(`- maker, checker1, checker2, signer / ${defaultPassword}`);
}

await ensureBootstrapAccounts();

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/auth/login": {
      async POST(req) {
        try {
          const body = await req.json();
          const username = typeof body.username === "string" ? body.username.trim() : "";
          const password = typeof body.password === "string" ? body.password : "";

          if (!username || !password) {
            return jsonError("Username and password are required", 400);
          }

          const user = getUserByUsername(username);
          if (!user || !(await verifyPassword(password, user.passwordHash))) {
            return jsonError("Invalid credentials", 401);
          }

          const token = issueAuthToken(user);
          return new Response(
            JSON.stringify({
              user: {
                id: user.id,
                username: user.username,
                role: user.role,
              },
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Set-Cookie": createAuthCookie(token),
              },
            }
          );
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/auth/logout": {
      async POST(req) {
        try {
          const user = await authenticateRequest(req);
          if (user) {
            invalidateUserSessions(user.id);
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": clearAuthCookie(),
            },
          });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/auth/me": {
      async GET(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          return Response.json({ user });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/auth/change-password": {
      async POST(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          const body = await req.json();
          const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
          const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

          if (!currentPassword || !newPassword) {
            return jsonError("Current password and new password are required", 400);
          }

          if (newPassword.length < 8) {
            return jsonError("New password must be at least 8 characters", 400);
          }

          const account = getUserByUsername(user.username);
          if (!account) {
            return jsonError("User not found", 404);
          }

          const validCurrentPassword = await verifyPassword(currentPassword, account.passwordHash);
          if (!validCurrentPassword) {
            return jsonError("Current password is incorrect", 401);
          }

          if (await verifyPassword(newPassword, account.passwordHash)) {
            return jsonError("New password must be different from current password", 400);
          }

          const nextHash = await hashPassword(newPassword);
          const updated = updateUserPassword(user.id, nextHash);
          if (!updated) {
            return jsonError("Unable to update password", 500);
          }

          const token = issueAuthToken(updated);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": createAuthCookie(token),
            },
          });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/auth/accounts": {
      async GET(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          if (user.role !== "ADMIN") {
            return jsonError("Forbidden", 403);
          }

          const users = listUsers().map(account => ({
            id: account.id,
            username: account.username,
            role: account.role,
            createdAt: account.createdAt,
          }));

          return Response.json({ users });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },

      async POST(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          if (user.role !== "ADMIN") {
            return jsonError("Forbidden", 403);
          }

          const body = await req.json();
          const username = typeof body.username === "string" ? body.username.trim() : "";
          const password = typeof body.password === "string" ? body.password : "";
          const role = body.role as AccountRole;

          if (!username || !password || !role) {
            return jsonError("Username, password and role are required", 400);
          }

          if (!isWorkflowRole(role)) {
            return jsonError("Invalid role", 400);
          }

          if (password.length < 8) {
            return jsonError("Password must be at least 8 characters", 400);
          }

          if (getUserByUsername(username)) {
            return jsonError("Username already exists", 409);
          }

          const created = createUserAccount({
            username,
            passwordHash: await hashPassword(password),
            role,
            createdBy: user.id,
          });

          return Response.json(
            {
              user: {
                id: created.id,
                username: created.username,
                role: created.role,
              },
            },
            { status: 201 }
          );
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    // Invoice API endpoints
    "/api/invoices": {
      async GET(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          const invoices = isWorkflowRole(user.role) ? getInvoicesByRole(user.role, user.id) : getAllInvoices();
          return Response.json({ invoices });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },

      async POST(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          if (user.role !== UserRole.MAKER) {
            return jsonError("Only maker can create invoices", 403);
          }

          const body = await req.json();
          const validation = validateInvoice(body);

          if (!validation.valid) {
            return Response.json({ error: validation.errors }, { status: 400 });
          }

          const invoice = createInvoice({
            invoiceNumber: body.invoiceNumber,
            amount: body.amount,
            description: body.description,
            vendor: body.vendor,
            date: body.date,
            status: InvoiceStatus.DRAFT,
            maker: user.id,
            currentRole: UserRole.CHECKER_1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            history: [],
          });

          return Response.json({ invoice }, { status: 201 });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/invoices/:id": {
      async GET(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          const id = req.params.id;
          const invoice = getInvoiceById(id);

          if (!invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          if (isWorkflowRole(user.role) && user.role === UserRole.MAKER && invoice.maker !== user.id) {
            return jsonError("Forbidden", 403);
          }

          return Response.json({ invoice });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },

      async PUT(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          if (user.role !== UserRole.MAKER) {
            return jsonError("Only maker can edit invoices", 403);
          }

          const id = req.params.id;
          const existingInvoice = getInvoiceById(id);
          if (!existingInvoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          if (existingInvoice.maker !== user.id) {
            return jsonError("Forbidden", 403);
          }

          const canEditStatus = existingInvoice.status === InvoiceStatus.INCOMPLETE || existingInvoice.status === InvoiceStatus.MISMATCH;
          if (!canEditStatus) {
            return jsonError("Invoice can only be edited after rejection", 409);
          }

          const body = await req.json();
          const validation = validateInvoice(body);

          if (!validation.valid) {
            return Response.json({ error: validation.errors }, { status: 400 });
          }

          const invoice = updateInvoiceData(id, {
            invoiceNumber: body.invoiceNumber,
            amount: body.amount,
            description: body.description,
            vendor: body.vendor,
            date: body.date,
          }, user.id);

          return Response.json({ invoice });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/invoices/:id/status": {
      async PUT(req) {
        try {
          const user = await authenticateRequest(req);
          if (!user) {
            return jsonError("Unauthorized", 401);
          }

          if (!isWorkflowRole(user.role) || user.role === UserRole.MAKER) {
            return jsonError("Forbidden", 403);
          }

          const id = req.params.id;
          const invoice = getInvoiceById(id);

          if (!invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          if (invoice.currentRole !== user.role) {
            return jsonError("Invoice is not assigned to your role", 409);
          }

          const body = await req.json();
          const action = body.action as "APPROVED" | "REJECTED" | "SENT_BACK";
          const comment = typeof body.comment === "string" ? body.comment : undefined;

          let nextStatus: InvoiceStatus;
          let nextRole: UserRole;

          if (action === "APPROVED") {
            if (user.role === UserRole.CHECKER_1) {
              nextStatus = InvoiceStatus.DRAFT;
              nextRole = UserRole.CHECKER_2;
            } else if (user.role === UserRole.CHECKER_2) {
              nextStatus = InvoiceStatus.DRAFT;
              nextRole = UserRole.SIGNER;
            } else {
              nextStatus = InvoiceStatus.READY_TO_PAY;
              nextRole = UserRole.SIGNER;
            }
          } else if (action === "REJECTED") {
            if (!comment?.trim()) {
              return jsonError("Rejection comment is required", 400);
            }

            nextStatus = user.role === UserRole.SIGNER ? InvoiceStatus.MISMATCH : InvoiceStatus.INCOMPLETE;
            nextRole = UserRole.MAKER;
          } else if (action === "SENT_BACK") {
            if (user.role !== UserRole.CHECKER_2) {
              return jsonError("Only Checker 2 can send back to Checker 1", 403);
            }

            nextStatus = InvoiceStatus.DRAFT;
            nextRole = UserRole.CHECKER_1;
          } else {
            return jsonError("Invalid action", 400);
          }

          const updatedInvoice = updateInvoiceStatus(id, nextStatus, nextRole, action, comment, user.id);
          if (!updatedInvoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          return Response.json({ invoice: updatedInvoice });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
