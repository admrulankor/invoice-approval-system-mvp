import { useInvoice } from "@/context/InvoiceContext";
import { InvoiceStatus } from "@/types/invoice";

export function Dashboard() {
  const { invoices } = useInvoice();

  const statusCounts = {
    [InvoiceStatus.DRAFT]: invoices.filter(i => i.status === InvoiceStatus.DRAFT).length,
    [InvoiceStatus.INCOMPLETE]: invoices.filter(i => i.status === InvoiceStatus.INCOMPLETE).length,
    [InvoiceStatus.MISMATCH]: invoices.filter(i => i.status === InvoiceStatus.MISMATCH).length,
    [InvoiceStatus.ON_HOLD]: invoices.filter(i => i.status === InvoiceStatus.ON_HOLD).length,
    [InvoiceStatus.READY_TO_PAY]: invoices.filter(i => i.status === InvoiceStatus.READY_TO_PAY).length,
  };

  const readyToPay = invoices.filter(i => i.status === InvoiceStatus.READY_TO_PAY);
  const totalAmount = readyToPay.reduce((sum, inv) => sum + inv.amount, 0);

  const StatCard = ({
    label,
    count,
    color,
    bgColor,
    darkBgColor,
  }: {
    label: string;
    count: number;
    color: string;
    bgColor: string;
    darkBgColor: string;
  }) => (
    <div className={`${bgColor} ${darkBgColor} border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold ${color} mt-2`}>{count}</p>
    </div>
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Invoice Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Draft" count={statusCounts[InvoiceStatus.DRAFT]} color="text-yellow-600 dark:text-yellow-400" bgColor="bg-yellow-50" darkBgColor="dark:bg-yellow-950/40" />
          <StatCard label="Incomplete" count={statusCounts[InvoiceStatus.INCOMPLETE]} color="text-red-600 dark:text-red-400" bgColor="bg-red-50" darkBgColor="dark:bg-red-950/35" />
          <StatCard label="Mismatch" count={statusCounts[InvoiceStatus.MISMATCH]} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-50" darkBgColor="dark:bg-orange-950/35" />
          <StatCard label="On Hold" count={statusCounts[InvoiceStatus.ON_HOLD]} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50" darkBgColor="dark:bg-blue-950/35" />
          <StatCard label="Ready to Pay" count={statusCounts[InvoiceStatus.READY_TO_PAY]} color="text-green-600 dark:text-emerald-400" bgColor="bg-green-50" darkBgColor="dark:bg-emerald-950/35" />
        </div>
      </div>

      {readyToPay.length > 0 && (
        <div className="bg-green-50 dark:bg-emerald-950/35 border border-green-300 dark:border-emerald-800 rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-green-900 dark:text-emerald-200 mb-2">Ready for Payment</h3>
          <p className="text-green-700 dark:text-emerald-300">
            <span className="font-semibold text-lg">{readyToPay.length}</span> invoice{readyToPay.length !== 1 ? 's' : ''} totaling{' '}
            <span className="font-semibold text-lg">${totalAmount.toFixed(2)}</span>
          </p>
        </div>
      )}
    </>
  );
}
