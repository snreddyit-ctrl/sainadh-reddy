import React, { useState } from 'react';
import { Clock, Search, CreditCard, ChevronRight, MapPin, Calendar, Receipt, Download, Printer } from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadRootPendingBillsCsv } from '../utils/exportBills';
import { printRootPendingBills } from '../utils/printPendingBills';

interface PendingBillsScreenProps {
  invoices: Invoice[];
  roots: string[];
  onSelectInvoice: (invoice: Invoice) => void;
  onQuickPayment: (billNo: string) => void;
  onOpenDownloadModal?: (root?: string) => void;
}

export const PendingBillsScreen: React.FC<PendingBillsScreenProps> = ({
  invoices,
  roots,
  onSelectInvoice,
  onQuickPayment,
  onOpenDownloadModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoot, setSelectedRoot] = useState<string>('All');
  const [pendingFilter, setPendingFilter] = useState<'ALL_PENDING' | 'PENDING_ONLY' | 'PART_PAID_ONLY'>('ALL_PENDING');

  // Filter only Pending or Part Paid invoices
  const pendingInvoices = invoices.filter((inv) => inv.status === 'Pending' || inv.status === 'Part Paid' || inv.amountPending > 0);

  const filtered = pendingInvoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inv.billNo.toLowerCase().includes(q) ||
      inv.root.toLowerCase().includes(q);

    const matchesRoot = selectedRoot === 'All' || inv.root.toLowerCase() === selectedRoot.toLowerCase();

    let matchesFilter = true;
    if (pendingFilter === 'PENDING_ONLY') matchesFilter = inv.status === 'Pending';
    if (pendingFilter === 'PART_PAID_ONLY') matchesFilter = inv.status === 'Part Paid';

    return matchesSearch && matchesRoot && matchesFilter;
  });

  const totalPendingSum = filtered.reduce((sum, inv) => sum + inv.amountPending, 0);

  const handlePrint = () => {
    printRootPendingBills(selectedRoot, invoices);
  };

  const handleDownload = () => {
    if (onOpenDownloadModal) {
      onOpenDownloadModal(selectedRoot === 'All' ? 'All' : selectedRoot);
    } else {
      downloadRootPendingBillsCsv(selectedRoot === 'All' ? 'All' : selectedRoot, invoices);
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Outstanding Pending
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">
            {formatCurrency(totalPendingSum)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across {filtered.length} unpaid customer accounts
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pending Bills Tally
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">
              {filtered.length} <span className="text-sm font-normal text-slate-500">bills</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs pt-2 text-slate-500 font-medium">
            <span>
              Pending: <strong className="text-red-600">{pendingInvoices.filter((i) => i.status === 'Pending').length}</strong>
            </span>
            <span>•</span>
            <span>
              Part Paid: <strong className="text-orange-500">{pendingInvoices.filter((i) => i.status === 'Part Paid').length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search pending bills by Bill No or Root..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Sub filters */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPendingFilter('ALL_PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pendingFilter === 'ALL_PENDING' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              All ({pendingInvoices.length})
            </button>
            <button
              onClick={() => setPendingFilter('PENDING_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pendingFilter === 'PENDING_ONLY' ? 'bg-white text-red-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Pending ({pendingInvoices.filter((i) => i.status === 'Pending').length})
            </button>
            <button
              onClick={() => setPendingFilter('PART_PAID_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pendingFilter === 'PART_PAID_ONLY' ? 'bg-white text-orange-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Part Paid ({pendingInvoices.filter((i) => i.status === 'Part Paid').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRoot}
              onChange={(e) => setSelectedRoot(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Routes</option>
              {roots.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Print pending bills statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Download pending bills formatted: SL.NO, Bill No, Bill Date, Amount paid, P/F, Bill Amount"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Invoices Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Pending Bills Found</h3>
            <p className="text-xs text-slate-500">All matching customer invoices are settled.</p>
          </div>
        ) : (
          filtered.map((invoice) => (
            <div
              key={invoice.billNo}
              onClick={() => onSelectInvoice(invoice)}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      Bill #{invoice.billNo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        invoice.status === 'Pending'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {invoice.root} • {formatDate(invoice.billDate)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Pending Balance</div>
                  <div className="text-base sm:text-lg font-bold text-red-600">
                    {formatCurrency(invoice.amountPending)}
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (invoice.amountPaid / invoice.billAmount) * 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Paid: {formatCurrency(invoice.amountPaid)}</span>
                  <span>Total Bill: {formatCurrency(invoice.billAmount)}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Click to view breakdown</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickPayment(invoice.billNo);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
