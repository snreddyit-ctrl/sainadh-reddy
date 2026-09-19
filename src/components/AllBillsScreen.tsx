import React, { useState } from 'react';
import { Search, PlusCircle, CreditCard, ChevronRight, MapPin, Calendar, Receipt, Download, Trash2 } from 'lucide-react';
import { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadRootPendingBillsCsv } from '../utils/exportBills';
import { BulkDeletePaidModal } from './BulkDeletePaidModal';

interface AllBillsScreenProps {
  invoices: Invoice[];
  roots: string[];
  onSelectInvoice: (invoice: Invoice) => void;
  onQuickPayment: (billNo: string) => void;
  onNavigateToAddInvoice: () => void;
  onOpenDownloadModal?: (root?: string) => void;
  onBulkDeletePaid?: (billNos: string[]) => Promise<{ success: boolean; count: number; message?: string }>;
}

export const AllBillsScreen: React.FC<AllBillsScreenProps> = ({
  invoices,
  roots,
  onSelectInvoice,
  onQuickPayment,
  onNavigateToAddInvoice,
  onOpenDownloadModal,
  onBulkDeletePaid,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceStatus>('All');
  const [rootFilter, setRootFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'pending_desc'>('date_desc');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Filter & Search
  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inv.billNo.toLowerCase().includes(q) ||
      inv.root.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const matchesRoot = rootFilter === 'All' || inv.root === rootFilter;

    return matchesSearch && matchesStatus && matchesRoot;
  });

  // Sorting
  const sortedInvoices = [...filtered].sort((a, b) => {
    if (sortBy === 'date_desc') return b.billDate.localeCompare(a.billDate) || b.billNo.localeCompare(a.billNo);
    if (sortBy === 'date_asc') return a.billDate.localeCompare(b.billDate) || a.billNo.localeCompare(b.billNo);
    if (sortBy === 'amount_desc') return b.billAmount - a.billAmount;
    if (sortBy === 'pending_desc') return b.amountPending - a.amountPending;
    return 0;
  });

  // Calculate quick totals for filtered set
  const totalBilled = filtered.reduce((acc, i) => acc + i.billAmount, 0);
  const totalPending = filtered.reduce((acc, i) => acc + i.amountPending, 0);

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-700" />
            All Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filtered.length} of {invoices.length} total records
          </p>
        </div>

        <div className="flex items-center gap-2">
          {statusFilter === 'Paid' && (
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs uppercase tracking-wider shadow-2xs transition-all active:scale-95 animate-fadeIn"
              title="Bulk delete settled paid invoices with date range"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Delete Paid Bills</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onOpenDownloadModal) {
                onOpenDownloadModal(rootFilter === 'All' ? 'All' : rootFilter);
              } else {
                downloadRootPendingBillsCsv(rootFilter === 'All' ? 'All' : rootFilter, invoices);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider shadow-2xs transition-all"
            title="Download pending bills formatted: Bill No, Bill Date, Bill Amount, Amount Paid, Amount Pending"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Download Pending</span>
          </button>

          <button
            onClick={onNavigateToAddInvoice}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Bill No or Root name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Status Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
            {(['All', 'Pending', 'Part Paid', 'Paid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Root & Sorting Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={rootFilter}
              onChange={(e) => setRootFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">All Roots</option>
              {roots.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="date_desc">Latest Date</option>
              <option value="date_asc">Oldest Date</option>
              <option value="pending_desc">Highest Pending</option>
              <option value="amount_desc">Highest Amount</option>
            </select>
          </div>
        </div>

        {/* Paid Status Action Callout */}
        {statusFilter === 'Paid' && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50/60 border border-red-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-red-900 font-medium">
              <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                Viewing <strong>{filtered.length}</strong> fully settled Paid bills. Need to delete older records?
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Paid (Date Range)</span>
            </button>
          </div>
        )}

        {/* Summary tally */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
          <span>
            Total Billed: <strong className="text-slate-900">{formatCurrency(totalBilled)}</strong>
          </span>
          <span>
            Total Pending: <strong className="text-red-600">{formatCurrency(totalPending)}</strong>
          </span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Bill No
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Root
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Bill Date
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Bill Amount
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Paid
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Pending
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              sortedInvoices.map((inv, idx) => (
                <tr
                  key={`${inv.billNo}-${idx}`}
                  onClick={() => onSelectInvoice(inv)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-900">
                    #{inv.billNo}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-700">
                    {inv.root}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {formatDate(inv.billDate)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-900 text-right">
                    {formatCurrency(inv.billAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-emerald-600 text-right">
                    {formatCurrency(inv.amountPaid)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-right">
                    <span className={inv.amountPending > 0 ? 'text-red-600' : 'text-slate-400'}>
                      {formatCurrency(inv.amountPending)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : inv.status === 'Part Paid'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.amountPending > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickPayment(inv.billNo);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition-all"
                        >
                          Pay
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="sm:hidden space-y-2.5">
        {sortedInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
            <h3 className="font-bold text-slate-700 text-sm">No invoices found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          sortedInvoices.map((invoice, idx) => (
            <div
              key={`${invoice.billNo}-${idx}`}
              onClick={() => onSelectInvoice(invoice)}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      #{invoice.billNo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        invoice.status === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'Part Paid'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
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
                  <div className="text-xs text-slate-400 font-medium">Bill Amount</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(invoice.billAmount)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Pending</span>
                  <span className={`font-bold ${invoice.amountPending > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {formatCurrency(invoice.amountPending)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {invoice.amountPending > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickPayment(invoice.billNo);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1 text-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay</span>
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Delete Paid Modal */}
      <BulkDeletePaidModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        invoices={invoices}
        roots={roots}
        onConfirmBulkDelete={
          onBulkDeletePaid ||
          (async () => ({ success: false, count: 0, message: 'Delete handler not configured.' }))
        }
      />
    </div>
  );
};
