import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Building2,
  Receipt,
  ArrowDownToLine,
  Filter,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadRootPendingBillsCsv, copyRootPendingBillsToClipboard } from '../utils/exportBills';

interface DownloadPendingBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roots: string[];
  invoices: Invoice[];
  defaultRoot?: string;
}

export const DownloadPendingBillsModal: React.FC<DownloadPendingBillsModalProps> = ({
  isOpen,
  onClose,
  roots,
  invoices,
  defaultRoot = 'All',
}) => {
  const [selectedRoot, setSelectedRoot] = useState<string>(defaultRoot);
  const [copied, setCopied] = useState(false);

  // Sync selectedRoot if defaultRoot changes
  React.useEffect(() => {
    if (defaultRoot) {
      setSelectedRoot(defaultRoot);
    }
  }, [defaultRoot]);

  if (!isOpen) return null;

  const isAll = selectedRoot === 'All';
  const pendingInvoices = invoices
    .filter((inv) => {
      const matchRoot = isAll ? true : inv.root.toLowerCase() === selectedRoot.toLowerCase();
      const isPending = inv.status === 'Pending' || inv.status === 'Part Paid' || inv.amountPending > 0;
      return matchRoot && isPending;
    })
    .sort((a, b) => a.billNo.localeCompare(b.billNo, undefined, { numeric: true }));

  const totalBilled = pendingInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  const handleDownload = () => {
    downloadRootPendingBillsCsv(selectedRoot, invoices);
  };

  const handleCopy = async () => {
    const ok = await copyRootPendingBillsToClipboard(selectedRoot, invoices);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Download Root-Wise Pending Bills</h3>
              <p className="text-[11px] text-slate-400">
                Format: Bill No • Bill Date • Bill Amount • Amount Paid • Amount Pending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls & Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="rootFilterSelect" className="text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Select Route:</span>
            </label>
            <select
              id="rootFilterSelect"
              value={selectedRoot}
              onChange={(e) => setSelectedRoot(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">All Routes ({invoices.filter((i) => i.amountPending > 0).length} pending)</option>
              {roots.map((r) => {
                const count = invoices.filter(
                  (i) => i.root.toLowerCase() === r.toLowerCase() && i.amountPending > 0
                ).length;
                return (
                  <option key={r} value={r}>
                    {r} ({count} pending)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={pendingInvoices.length === 0}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Copy table to paste in Excel or Google Sheets"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Table</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={pendingInvoices.length === 0}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {pendingInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">No pending bills found</p>
              <p className="text-xs text-slate-400 mt-1">
                {isAll ? 'All customer bills across all roots are fully settled.' : `All bills for ${selectedRoot} are fully paid.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>
                  Showing <strong>{pendingInvoices.length}</strong> pending {pendingInvoices.length === 1 ? 'bill' : 'bills'} for{' '}
                  <strong className="text-slate-900">{isAll ? 'All Routes' : selectedRoot}</strong>
                </span>
                <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                  Format: Bill No • Bill Date • Bill Amount • Amount Paid • Amount Pending
                </span>
              </div>

              {/* Exact Format Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      {isAll && <th className="py-2.5 px-3">Root</th>}
                      <th className="py-2.5 px-3">Bill No</th>
                      <th className="py-2.5 px-3">Bill Date</th>
                      <th className="py-2.5 px-3 text-right">Bill Amount</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Amount Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pendingInvoices.map((inv) => (
                      <tr key={inv.billNo} className="hover:bg-slate-50 transition-colors">
                        {isAll && <td className="py-2 px-3 font-medium text-slate-600">{inv.root}</td>}
                        <td className="py-2 px-3 font-bold text-slate-900">{inv.billNo}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(inv.billDate)}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {formatCurrency(inv.billAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-600">
                          {formatCurrency(inv.amountPaid)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-red-600">
                          {formatCurrency(inv.amountPending)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
                    <tr>
                      <td colSpan={isAll ? 3 : 2} className="py-2.5 px-3">
                        Total ({pendingInvoices.length} bills)
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(totalBilled)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600">{formatCurrency(totalPaid)}</td>
                      <td className="py-2.5 px-3 text-right text-red-600">{formatCurrency(totalPending)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Total Pending: <strong className="text-red-600">{formatCurrency(totalPending)}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={pendingInvoices.length === 0}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
