import { useState, useEffect } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { InvoiceStatus } from "@/types/invoice";

export function InvoiceForm() {
  const { createInvoice, updateInvoice, error, selectedInvoice } = useInvoice();
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    amount: "",
    description: "",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = selectedInvoice && (selectedInvoice.status === InvoiceStatus.INCOMPLETE || selectedInvoice.status === InvoiceStatus.MISMATCH);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedInvoice) {
      setFormData({
        invoiceNumber: selectedInvoice.invoiceNumber,
        amount: selectedInvoice.amount.toString(),
        description: selectedInvoice.description,
        vendor: selectedInvoice.vendor,
        date: selectedInvoice.date,
      });
    } else {
      setFormData({
        invoiceNumber: "",
        amount: "",
        description: "",
        vendor: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [selectedInvoice, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing && selectedInvoice) {
      const result = await updateInvoice(selectedInvoice.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });

      if (result) {
        setFormData({
          invoiceNumber: "",
          amount: "",
          description: "",
          vendor: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
    } else {
      const result = await createInvoice({
        ...formData,
        amount: parseFloat(formData.amount),
      });

      if (result) {
        setFormData({
          invoiceNumber: "",
          amount: "",
          description: "",
          vendor: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div id="invoice-form" className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-8 max-w-2xl mx-auto mb-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{isEditing ? "Edit Invoice" : "Create New Invoice"}</h2>
      {isEditing && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-6">
            ⚠️ This invoice was rejected and needs to be corrected. Please update the fields below and resubmit.
          </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Invoice Number *</label>
          <input
            type="text"
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleChange}
            required
            disabled={isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
            placeholder="INV-2024-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Amount *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Vendor *</label>
          <input
            type="text"
            name="vendor"
            value={formData.vendor}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Vendor Name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Invoice description"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Resubmit Invoice" : "Create Invoice"}
        </button>
      </form>
    </div>
  );
}
