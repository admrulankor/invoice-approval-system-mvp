import { Database } from "bun:sqlite";
import { Invoice, InvoiceStatus, UserRole, InvoiceHistoryEntry } from "@/types/invoice";

const db = new Database("invoices.db");

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
      FOREIGN KEY (invoiceId) REFERENCES invoices(id)
    );
  `);
}

export function createInvoice(invoice: Omit<Invoice, "id" | "history">): Invoice {
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO invoices (id, invoiceNumber, amount, description, vendor, date, status, maker, currentRole, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, invoice.invoiceNumber, invoice.amount, invoice.description, invoice.vendor, invoice.date, invoice.status, invoice.maker, invoice.currentRole, now, now);

  db.prepare(`
    INSERT INTO invoice_history (invoiceId, timestamp, role, action, status, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, now, invoice.maker, "CREATED", invoice.status, "Invoice created");

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
      })),
    };
  });
}

export function updateInvoiceStatus(
  id: string,
  newStatus: InvoiceStatus,
  role: UserRole,
  action: string,
  comment?: string
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
    INSERT INTO invoice_history (invoiceId, timestamp, role, action, status, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, now, role, action, newStatus, comment || null);

  return getInvoiceById(id);
}

export function updateInvoiceData(
  id: string,
  data: { invoiceNumber?: string; amount?: number; description?: string; vendor?: string; date?: string }
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
    INSERT INTO invoice_history (invoiceId, timestamp, role, action, status, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, now, UserRole.MAKER, "CREATED", InvoiceStatus.DRAFT, "Invoice corrected and resubmitted");

  return getInvoiceById(id);
}

export function getInvoicesByRole(role: UserRole): Invoice[] {
  const allInvoices = getAllInvoices();

  switch (role) {
    case UserRole.MAKER:
      return allInvoices.filter(
        inv => inv.maker === "MAKER" || inv.status === InvoiceStatus.INCOMPLETE || inv.status === InvoiceStatus.MISMATCH
      );

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
