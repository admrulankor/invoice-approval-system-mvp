import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole } from "@/types/invoice";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { useAuth } from "@/context/AuthContext";

interface InvoiceContextType {
  role: UserRole | null;
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

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const role = user?.role && Object.values(UserRole).includes(user.role as UserRole) ? (user.role as UserRole) : null;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!user) {
      setInvoices([]);
      setSelectedInvoice(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/invoices", { credentials: "include" });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch invoices");
        setInvoices([]);
        return;
      }

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
        credentials: "include",
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
        credentials: "include",
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
      await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    if (!user) {
      setInvoices([]);
      setSelectedInvoice(null);
      return;
    }

    fetchInvoices();
  }, [user?.id, role]);

  return (
    <InvoiceContext.Provider
      value={{
        role,
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
