import { Invoice, ValidationResult } from "@/types/invoice";

export function validateInvoice(invoice: Partial<Invoice>): ValidationResult {
  const errors: string[] = [];

  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === "") {
    errors.push("Invoice number is required");
  }

  if (invoice.amount === undefined || invoice.amount === null) {
    errors.push("Amount is required");
  } else if (invoice.amount <= 0) {
    errors.push("Amount must be greater than zero");
  } else if (invoice.amount > 1000000) {
    errors.push("Amount exceeds maximum limit");
  }

  if (!invoice.description || invoice.description.trim() === "") {
    errors.push("Description is required");
  }

  if (!invoice.vendor || invoice.vendor.trim() === "") {
    errors.push("Vendor is required");
  }

  if (!invoice.date || invoice.date.trim() === "") {
    errors.push("Date is required");
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      errorCode: "INCOMPLETE",
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
