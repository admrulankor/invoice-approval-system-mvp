export enum InvoiceStatus {
  DRAFT = "DRAFT",
  INCOMPLETE = "INCOMPLETE",
  MISMATCH = "MISMATCH",
  ON_HOLD = "ON_HOLD",
  READY_TO_PAY = "READY_TO_PAY",
}

export enum UserRole {
  MAKER = "MAKER",
  CHECKER_1 = "CHECKER_1",
  CHECKER_2 = "CHECKER_2",
  SIGNER = "SIGNER",
}

export interface InvoiceHistoryEntry {
  timestamp: number;
  role: UserRole;
  action: "CREATED" | "APPROVED" | "REJECTED" | "SENT_BACK";
  status: InvoiceStatus;
  comment?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  vendor: string;
  date: string;
  status: InvoiceStatus;
  maker: string;
  currentRole: UserRole;
  createdAt: number;
  updatedAt: number;
  history: InvoiceHistoryEntry[];
  rejectionReason?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  errorCode?: "INCOMPLETE" | "MISMATCH" | "ON_HOLD";
}
