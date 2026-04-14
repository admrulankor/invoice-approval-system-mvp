import { useInvoice } from "@/context/InvoiceContext";
import { UserRole } from "@/types/invoice";

export function RoleSelector() {
  const { role, setRole } = useInvoice();

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Select Your Role</h2>
      <div className="flex gap-3 flex-wrap">
        {Object.values(UserRole).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-5 py-2 rounded-lg font-medium transition-all ${
              role === r
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-300"
            }`}
          >
            {r.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
