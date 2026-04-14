import { useInvoice } from "@/context/InvoiceContext";
import { UserRole, InvoiceStatus } from "@/types/invoice";

export function InvoiceList() {
  const { invoices, selectedInvoice, setSelectedInvoice, role, loading } = useInvoice();

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case InvoiceStatus.INCOMPLETE:
        return "bg-red-100 text-red-800 border-red-300";
      case InvoiceStatus.MISMATCH:
        return "bg-orange-100 text-orange-800 border-orange-300";
      case InvoiceStatus.ON_HOLD:
        return "bg-blue-100 text-blue-800 border-blue-300";
      case InvoiceStatus.READY_TO_PAY:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case UserRole.MAKER:
        return "Your Invoices & Corrections";
      case UserRole.CHECKER_1:
        return "Invoices Pending Level 1 Validation";
      case UserRole.CHECKER_2:
        return "Invoices Pending Level 2 Validation";
      case UserRole.SIGNER:
        return "Invoices Awaiting Final Approval";
    }
  };

  const getActionLabel = (status: InvoiceStatus) => {
    if (status === InvoiceStatus.INCOMPLETE || status === InvoiceStatus.MISMATCH) {
      return "Edit";
    }
    return "View";
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 shadow-sm">
        <p className="text-lg">No invoices available for your current role.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 mb-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{getRoleLabel()}</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b-2 border-gray-300 dark:border-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Invoice #</th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Amount</th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Vendor</th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, idx) => (
              <tr key={invoice.id} className={`border-b border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-slate-950/50' : ''}`}>
                <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">${invoice.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{invoice.vendor}</td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{new Date(invoice.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      const nextInvoice = selectedInvoice?.id === invoice.id ? null : invoice;
                      setSelectedInvoice(nextInvoice);

                      if (
                        nextInvoice &&
                        (nextInvoice.status === InvoiceStatus.INCOMPLETE || nextInvoice.status === InvoiceStatus.MISMATCH)
                      ) {
                        // Wait for React render, then move focus to the edit form.
                        setTimeout(() => {
                          document.getElementById("invoice-form")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }, 0);
                      }
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      selectedInvoice?.id === invoice.id
                        ? 'bg-gray-300 text-gray-800'
                        : (invoice.status === InvoiceStatus.INCOMPLETE || invoice.status === InvoiceStatus.MISMATCH)
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {selectedInvoice?.id === invoice.id ? "Hide" : getActionLabel(invoice.status)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
