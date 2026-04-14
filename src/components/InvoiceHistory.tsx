import { InvoiceHistoryEntry } from "@/types/invoice";

interface Props {
  history: InvoiceHistoryEntry[];
}

export function InvoiceHistory({ history }: Props) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 mt-8">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-lg">Audit Trail</h3>
      <div className="space-y-4 text-sm">
        {history.map((entry, idx) => (
          <div key={idx} className="border-l-4 border-blue-400 bg-white dark:bg-slate-900 rounded-r pl-4 pr-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {entry.action} • {entry.role.replace(/_/g, " ")}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">Status: <span className="font-medium">{entry.status}</span></p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
            </div>
            {entry.comment && <p className="text-gray-700 dark:text-gray-200 italic mt-2 bg-gray-50 dark:bg-slate-800 rounded p-2">"{entry.comment}"</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
