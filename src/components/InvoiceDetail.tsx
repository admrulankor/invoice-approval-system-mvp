import { useState } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { UserRole } from "@/types/invoice";
import { InvoiceHistory } from "./InvoiceHistory";

export function InvoiceDetail() {
  const { selectedInvoice, role, approveInvoice, rejectInvoice, sendBackToChecker1 } = useInvoice();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedInvoice) {
    return null;
  }

  const handleApprove = async () => {
    setIsSubmitting(true);
    await approveInvoice(selectedInvoice.id);
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!rejectionComment.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    await rejectInvoice(selectedInvoice.id, rejectionComment);
    setIsSubmitting(false);
    setIsRejecting(false);
    setRejectionComment("");
  };

  const handleSendBackToChecker1 = async () => {
    setIsSubmitting(true);
    await sendBackToChecker1(selectedInvoice.id, "Sending back for further validation");
    setIsSubmitting(false);
  };

  const canApprove = role === UserRole.CHECKER_1 || role === UserRole.CHECKER_2 || role === UserRole.SIGNER;
  const canReject = role === UserRole.CHECKER_1 || role === UserRole.CHECKER_2 || role === UserRole.SIGNER;
  const canSendBackToChecker1 = role === UserRole.CHECKER_2;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-8 mt-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Invoice Details</h2>

      <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200 dark:border-slate-700">
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoice Number</label>
          <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100 mt-1">{selectedInvoice.invoiceNumber}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</label>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">${selectedInvoice.amount.toFixed(2)}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</label>
          <p className="text-lg text-gray-900 dark:text-gray-100 mt-1">{selectedInvoice.vendor}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</label>
          <p className="text-lg text-gray-900 dark:text-gray-100 mt-1">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</label>
          <p className="text-lg text-gray-900 dark:text-gray-100 mt-1">{selectedInvoice.description}</p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Current Status</h3>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{selectedInvoice.status}</p>
        {selectedInvoice.rejectionReason && (
          <div className="mt-3 text-blue-800 dark:text-blue-300 text-sm bg-white dark:bg-slate-900 rounded p-3 border border-blue-300 dark:border-blue-800">
            <strong>Rejection Reason:</strong>
            <p className="mt-1">{selectedInvoice.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isRejecting && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? "Processing..." : "Approve"}
            </button>
          )}

          {canReject && (
            <button
              onClick={() => setIsRejecting(true)}
              disabled={isSubmitting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? "Processing..." : "Reject"}
            </button>
          )}

          {canSendBackToChecker1 && (
            <button
              onClick={handleSendBackToChecker1}
              disabled={isSubmitting}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? "Processing..." : "Send Back to Checker 1"}
            </button>
          )}
        </div>
      )}

      {/* Rejection comment form */}
      {isRejecting && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-red-900 mb-3">Reason for Rejection *</label>
          <textarea
            value={rejectionComment}
            onChange={e => setRejectionComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            placeholder="Please explain why this invoice is being rejected..."
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Confirm Rejection"}
            </button>
            <button
              onClick={() => {
                setIsRejecting(false);
                setRejectionComment("");
              }}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Audit History */}
      <InvoiceHistory history={selectedInvoice.history} />
    </div>
  );
}
