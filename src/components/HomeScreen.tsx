import React, { useState } from 'react';
import {
  Receipt,
  Clock,
  PlusCircle,
  CreditCard,
  Building2,
  BarChart3,
  Search,
  ArrowRight,
  MapPin,
  Calendar,
  Download,
} from 'lucide-react';
import { ActiveScreen, DashboardSummary, Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

interface HomeScreenProps {
  summary: DashboardSummary;
  recentInvoices: Invoice[];
  onNavigate: (screen: ActiveScreen) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenSheetsModal: () => void;
  onOpenExportCenter?: () => void;
  isConnected: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  summary,
  recentInvoices,
  onNavigate,
  onSelectInvoice,
  onOpenSheetsModal,
  onOpenExportCenter,
  isConnected,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recent invoices by search query
  const filteredRecent = recentInvoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return inv.billNo.toLowerCase().includes(q) || inv.root.toLowerCase().includes(q);
  });

  const maxPending = Math.max(1, ...summary.rootPending.map((r) => r.pendingAmount));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 4-Column Top Header Metrics */}
      <header className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Receivables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Receivables
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(summary.totalBillAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total revenue billed</p>
        </div>

        {/* Pending Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Pending Amount
          </p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalPendingAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.pendingBillsCount + summary.partPaidBillsCount} bills unpaid
          </p>
        </div>

        {/* Total Bills */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Bills
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {summary.totalBills}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {summary.paidBillsCount} fully settled
          </p>
        </div>

        {/* Amount Paid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Collected
          </p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalAmountPaid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.collectionRate}% collection rate
          </p>
        </div>
      </header>

      {/* Main Grid: Left Side (Recent Invoices) & Right Side (Quick Actions & Root-wise Pending) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section: Recent Invoices Table */}
        <section className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[380px]">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-base flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-slate-600" />
                Recent Invoices
              </h2>
              <button
                onClick={() => onNavigate('all_bills')}
                className="sm:hidden text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <input
                  type="text"
                  placeholder="Search Bill No or Root..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              </div>

              <button
                onClick={() => onNavigate('all_bills')}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline shrink-0"
              >
                <span>View All ({summary.totalBills})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Bill No
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Root
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No invoices found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredRecent.slice(0, 7).map((inv) => (
                    <tr
                      key={inv.billNo}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        #{inv.billNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                        {inv.root}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(inv.billDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatCurrency(inv.billAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden divide-y divide-slate-100 flex-1">
            {filteredRecent.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No invoices found.
              </div>
            ) : (
              filteredRecent.slice(0, 5).map((inv) => (
                <div
                  key={inv.billNo}
                  onClick={() => onSelectInvoice(inv)}
                  className="p-3.5 hover:bg-slate-50 active:bg-slate-100 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        #{inv.billNo}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'Paid'
                            ? 'bg-green-100 text-green-700'
                            : inv.status === 'Part Paid'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {inv.root} • {inv.billDate}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatCurrency(inv.billAmount)}
                    </div>
                    {inv.amountPending > 0 ? (
                      <div className="text-[11px] font-semibold text-red-600">
                        Due: {formatCurrency(inv.amountPending)}
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-green-600">Settled</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Section: Quick Actions & Root-wise Pending */}
        <section className="flex flex-col space-y-6">
          {/* Quick Action Navigation Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center">
              <span>⚡</span>
              <span className="ml-2">Quick Actions</span>
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate('add_invoice')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 uppercase tracking-wide text-xs flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Invoice</span>
              </button>

              <button
                onClick={() => onNavigate('add_payment')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 uppercase tracking-wide text-xs flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>
            </div>

            {onOpenExportCenter && (
              <button
                type="button"
                onClick={onOpenExportCenter}
                className="w-full bg-slate-50 hover:bg-blue-50 text-blue-700 font-bold py-2.5 px-3 rounded-xl border border-blue-200/80 shadow-2xs transition-all active:scale-95 text-xs flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export & Download Files</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
              <button
                onClick={() => onNavigate('pending_bills')}
                className="py-2 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left flex items-center justify-between border border-slate-200"
              >
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span>Pending</span>
                </span>
                <span className="font-bold text-red-600">
                  {summary.pendingBillsCount + summary.partPaidBillsCount}
                </span>
              </button>

              <button
                onClick={() => onNavigate('root_pending')}
                className="py-2 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left flex items-center justify-between border border-slate-200"
              >
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  <span>Roots</span>
                </span>
                <span className="font-bold text-slate-800">
                  {summary.rootPending.length}
                </span>
              </button>
            </div>
          </div>

          {/* Root-wise Pending Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-slate-600" />
                Root-wise Pending
              </h2>
              <button
                onClick={() => onNavigate('root_pending')}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Details →
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-auto">
              {summary.rootPending.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No root data recorded.
                </div>
              ) : (
                summary.rootPending.map((item) => {
                  const percentage = Math.round((item.pendingAmount / maxPending) * 100);
                  const isHigh = percentage > 50;

                  return (
                    <div key={item.root} className="space-y-1.5">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="font-medium text-slate-700">{item.root}</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.pendingAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isHigh ? 'bg-red-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
