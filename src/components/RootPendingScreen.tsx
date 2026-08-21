import React from 'react';
import { Building2, ArrowLeft, ChevronRight, CreditCard, Settings, Plus, Trash2, Download, ArrowDownToLine } from 'lucide-react';
import { Invoice, RootPendingSummary } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadRootPendingBillsCsv } from '../utils/exportBills';

interface RootPendingScreenProps {
  rootPendingList: RootPendingSummary[];
  invoices: Invoice[];
  onBack: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onQuickPayment: (billNo: string) => void;
  onOpenManageRoots: () => void;
  onOpenDownloadModal?: (root?: string) => void;
}

export const RootPendingScreen: React.FC<RootPendingScreenProps> = ({
  rootPendingList,
  invoices,
  onBack,
  onSelectInvoice,
  onQuickPayment,
  onOpenManageRoots,
  onOpenDownloadModal,
}) => {
  const totalPendingAllRoots = rootPendingList.reduce((sum, r) => sum + r.pendingAmount, 0);

  const handleDownloadAll = () => {
    if (onOpenDownloadModal) {
      onOpenDownloadModal('All');
    } else {
      downloadRootPendingBillsCsv('All', invoices);
    }
  };

  const handleDownloadRoot = (e: React.MouseEvent, rootName: string) => {
    e.stopPropagation();
    downloadRootPendingBillsCsv(rootName, invoices);
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              Root-wise Pending
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Route-by-route outstanding balance analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleDownloadAll}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
            title="Download pending bills formatted: Bill No, Bill Date, Bill Amount, Amount Paid, Amount Pending"
          >
            <Download className="w-4 h-4" />
            <span>Download Pending Bills</span>
          </button>

          <button
            type="button"
            onClick={onOpenManageRoots}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Roots</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Outstanding Across All Routes
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">
            {formatCurrency(totalPendingAllRoots)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across {rootPendingList.length} registered distribution routes
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Active Distribution Roots
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {rootPendingList.length} <span className="text-sm font-normal text-slate-500">routes</span>
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {rootPendingList.filter((r) => r.pendingAmount === 0).length} routes fully settled
          </p>
        </div>
      </div>

      {/* Root Cards */}
      <div className="space-y-4">
        {rootPendingList.map((item) => {
          const rootInvoices = invoices.filter((i) => i.root === item.root);
          const pendingRootInvoices = rootInvoices.filter(
            (i) => i.status === 'Pending' || i.status === 'Part Paid'
          );

          return (
            <div
              key={item.root}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Root Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {item.root.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{item.root}</h3>
                    <span className="text-xs text-slate-500">
                      {item.billCount} total bills ({item.pendingCount} unpaid)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleDownloadRoot(e, item.root)}
                    disabled={pendingRootInvoices.length === 0}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    title={`Download pending bills for ${item.root}`}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Pending Balance</div>
                    <div className="text-base font-bold text-red-600">
                      {formatCurrency(item.pendingAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices belonging to this root */}
              <div className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Unpaid Invoices in {item.root}
                </div>

                {pendingRootInvoices.length === 0 ? (
                  <div className="py-3 text-center text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-xl border border-emerald-100">
                    All customer bills for {item.root} are fully settled.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingRootInvoices.map((inv) => (
                      <div
                        key={inv.billNo}
                        onClick={() => onSelectInvoice(inv)}
                        className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              #{inv.billNo}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                inv.status === 'Part Paid'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDate(inv.billDate)} • Total: {formatCurrency(inv.billAmount)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs font-bold text-red-600">
                              {formatCurrency(inv.amountPending)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Paid: {formatCurrency(inv.amountPaid)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickPayment(inv.billNo);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
