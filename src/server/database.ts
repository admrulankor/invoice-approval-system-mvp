import { Database } from "bun:sqlite";
import { InvoiceStatus, UserRole } from "@/types/invoice";
import type { AccountRole, Invoice } from "@/types/invoice";

const db = new Database("invoices.db");

export interface UserAccountRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: AccountRole;
  tokenVersion: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string | null;
}

function ensureColumn(tableName: string, columnName: string, columnType: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const hasColumn = columns.some(column => column.name === columnName);

  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`);
  }
}

function mapUserRecord(row: any): UserAccountRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    role: row.role as AccountRole,
    tokenVersion: Number(row.tokenVersion),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    createdBy: row.createdBy ?? null,
  };
}

// Initialize database schema
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      vendor TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      maker TEXT NOT NULL,
      currentRole TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      rejectionReason TEXT
    );

    CREATE TABLE IF NOT EXISTS invoice_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      comment TEXT,
      actorId TEXT,
      FOREIGN KEY (invoiceId) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('MAKER', 'CHECKER_1', 'CHECKER_2', 'SIGNER', 'ADMIN')),
      tokenVersion INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      createdBy TEXT
    );
  `);

  ensureColumn("invoice_history", "actorId", "TEXT");
}

export function createInvoice(invoice: Omit<Invoice, "id" | "history">): Invoice {
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO invoices (id, invoiceNumber, amount, description, vendor, date, status, maker, currentRole, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, invoice.invoiceNumber, invoice.amount, invoice.description, invoice.vendor, invoice.date, invoice.status, invoice.maker, invoice.currentRole, now, now);

  db.prepare(`
    INSERT INTO invoice_history (invoiceId, timestamp, role, action, status, comment, actorId)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, UserRole.MAKER, "CREATED", invoice.status, "Invoice created", invoice.maker);

  return getInvoiceById(id)!;
}

export function getInvoiceById(id: string): Invoice | null {
  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as any;
  if (!invoice) return null;

  const history = db.prepare("SELECT * FROM invoice_history WHERE invoiceId = ? ORDER BY timestamp ASC").all(id) as any[];

  return {
    ...invoice,
    amount: Number(invoice.amount),
    createdAt: Number(invoice.createdAt),
    updatedAt: Number(invoice.updatedAt),
    history: history.map(h => ({
      timestamp: Number(h.timestamp),
      role: h.role as UserRole,
      action: h.action,
      status: h.status as InvoiceStatus,
      comment: h.comment,
      actorId: h.actorId,
    })),
  };
}

export function getAllInvoices(): Invoice[] {
  const invoices = db.prepare("SELECT * FROM invoices ORDER BY updatedAt DESC").all() as any[];
  return invoices.map(inv => {
    const history = db.prepare("SELECT * FROM invoice_history WHERE invoiceId = ? ORDER BY timestamp ASC").all(inv.id) as any[];
    return {
      ...inv,
      amount: Number(inv.amount),
      createdAt: Number(inv.createdAt),
      updatedAt: Number(inv.updatedAt),
      history: history.map(h => ({
        timestamp: Number(h.timestamp),
        role: h.role as UserRole,
        action: h.action,
        status: h.status as InvoiceStatus,
        comment: h.comment,
        actorId: h.actorId,
      })),
    };
  });
}

export function updateInvoiceStatus(
  id: string,
  newStatus: InvoiceStatus,
  role: UserRole,
  action: string,
  comment?: string,
  actorId?: string
): Invoice | null {
  const invoice = getInvoiceById(id);
  if (!invoice) return null;

  const now = Date.now();

  db.prepare("UPDATE invoices SET status = ?, currentRole = ?, updatedAt = ?, rejectionReason = ? WHERE id = ?").run(
    newStatus,
    role,
    now,
    comment || null,
    id
  );

  db.prepare(`
    INSERT INTO invoice_history (invoiceId, timestamp, role, action, status, comment, actorId)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, role, action, newStatus, comment || null, actorId || null);

  return getInvoiceById(id);
}

export function updateInvoiceData(
  id: string,
  data: { invoiceNumber?: string; amount?: number; description?: string; vendor?: string; date?: string },
  actorId: string
): Invoice | null {
  const invoice = getInvoiceById(id);
  if (!invoice) return null;

  const now = Date.now();
  const updates = {
    invoiceNumber: data.invoiceNumber ?? invoice.invoiceNumber,
    amount: data.amount ?? invoice.amount,
    description: data.description ?? invoice.description,
    vendor: data.vendor ?? invoice.vendor,
    date: data.date ?? invoice.date,
  };

  db.prepare(
    "UPDATE invoices SET invoiceNumber = ?, amount = ?, description = ?, vendor = ?, date = ?, status = ?, currentRole = ?, updatedAt = ?, rejectionReason = NULL WHERE id = ?"
  ).run(
    updates.invoiceNumber,
    updates.amount,
    updates.description,
    updates.vendor,
    updates.date,
    InvoiceStatus.DRAFT,
    UserRole.CHECKER_1,
    now,
    id
  );

  db.prepare(`
    INSERT INTO invoice_history (invoiceId, timestamp, role, action, status, comment, actorId)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, UserRole.MAKER, "CREATED", InvoiceStatus.DRAFT, "Invoice corrected and resubmitted", actorId);

  return getInvoiceById(id);
}

export function getInvoicesByRole(role: UserRole, userId: string): Invoice[] {
  const allInvoices = getAllInvoices();

  switch (role) {
    case UserRole.MAKER:
      return allInvoices.filter(inv => inv.maker === userId);

    case UserRole.CHECKER_1:
      return allInvoices.filter(inv => inv.status === InvoiceStatus.DRAFT && inv.currentRole === UserRole.CHECKER_1);

    case UserRole.CHECKER_2:
      return allInvoices.filter(inv => inv.currentRole === UserRole.CHECKER_2);

    case UserRole.SIGNER:
      return allInvoices.filter(inv => inv.currentRole === UserRole.SIGNER);

    default:
      return [];
  }
}

export function createUserAccount(input: {
  username: string;
  passwordHash: string;
  role: AccountRole;
  createdBy?: string;
}): UserAccountRecord {
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO users (id, username, passwordHash, role, tokenVersion, createdAt, updatedAt, createdBy)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`
  ).run(id, input.username, input.passwordHash, input.role, now, now, input.createdBy ?? null);

  return getUserById(id)!;
}

export function getUserByUsername(username: string): UserAccountRecord | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  return row ? mapUserRecord(row) : null;
}

export function getUserById(id: string): UserAccountRecord | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  return row ? mapUserRecord(row) : null;
}

export function listUsers(): UserAccountRecord[] {
  const rows = db.prepare("SELECT * FROM users ORDER BY createdAt ASC").all() as any[];
  return rows.map(mapUserRecord);
}

export function getUserCount(): number {
  const result = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return Number(result.count);
}

export function incrementUserTokenVersion(userId: string): void {
  db.prepare("UPDATE users SET tokenVersion = tokenVersion + 1, updatedAt = ? WHERE id = ?").run(Date.now(), userId);
}

export function updateUserPassword(userId: string, passwordHash: string): UserAccountRecord | null {
  const now = Date.now();
  db.prepare("UPDATE users SET passwordHash = ?, tokenVersion = tokenVersion + 1, updatedAt = ? WHERE id = ?").run(passwordHash, now, userId);
  return getUserById(userId);
}
