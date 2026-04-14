import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Invoice, UserRole, InvoiceStatus } from "@/types/invoice";

interface InvoiceContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  loading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
  createInvoice: (data: any) => Promise<Invoice | null>;
  updateInvoice: (id: string, data: any) => Promise<Invoice | null>;
  approveInvoice: (id: string, comment?: string) => Promise<void>;
  rejectInvoice: (id: string, comment: string) => Promise<void>;
  sendBackToChecker1: (id: string, comment?: string) => Promise<void>;
}

const InvoiceContext = createContext<InvoiceContextType | null>(null);

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(UserRole.MAKER);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/role/${role}`);
      const data = await response.json();
      setInvoices(data.invoices || []);
      setSelectedInvoice(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (data: any): Promise<Invoice | null> => {
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, maker: "MAKER" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(Array.isArray(errorData.error) ? errorData.error.join(", ") : errorData.error);
        return null;
      }

      const result = await response.json();
      await fetchInvoices();
      return result.invoice;
    } catch (err) {
      setError(String(err));
      return null;
    }
  };

  const updateInvoice = async (id: string, data: any): Promise<Invoice | null> => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(Array.isArray(errorData.error) ? errorData.error.join(", ") : errorData.error);
        return null;
      }

      const result = await response.json();
      await fetchInvoices();
      setSelectedInvoice(null);
      return result.invoice;
    } catch (err) {
      setError(String(err));
      return null;
    }
  };

  const approveInvoice = async (id: string, comment?: string) => {
    try {
      let newStatus = InvoiceStatus.DRAFT;
      let nextRole = UserRole.CHECKER_2;

      if (role === UserRole.CHECKER_1) {
        newStatus = InvoiceStatus.DRAFT;
        nextRole = UserRole.CHECKER_2;
      } else if (role === UserRole.CHECKER_2) {
        newStatus = InvoiceStatus.DRAFT;
        nextRole = UserRole.SIGNER;
      } else if (role === UserRole.SIGNER) {
        newStatus = InvoiceStatus.READY_TO_PAY;
        nextRole = UserRole.SIGNER;
      }

      await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          role: nextRole,
          action: "APPROVED",
          comment,
        }),
      });

      await fetchInvoices();
    } catch (err) {
      setError(String(err));
    }
  };

  const rejectInvoice = async (id: string, comment: string) => {
    try {
      const rejectionStatus = role === UserRole.SIGNER ? InvoiceStatus.DRAFT : InvoiceStatus.INCOMPLETE;

      await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: rejectionStatus,
          role: UserRole.MAKER,
          action: "REJECTED",
          comment,
        }),
      });

      await fetchInvoices();
    } catch (err) {
      setError(String(err));
    }
  };

  const sendBackToChecker1 = async (id: string, comment?: string) => {
    try {
      await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: InvoiceStatus.DRAFT,
          role: UserRole.CHECKER_1,
          action: "SENT_BACK",
          comment,
        }),
      });

      await fetchInvoices();
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [role]);

  return (
    <InvoiceContext.Provider
      value={{
        role,
        setRole,
        invoices,
        selectedInvoice,
        setSelectedInvoice,
        loading,
        error,
        fetchInvoices,
        createInvoice,
        updateInvoice,
        approveInvoice,
        rejectInvoice,
        sendBackToChecker1,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoice() {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoice must be used within InvoiceProvider");
  }
  return context;
}
