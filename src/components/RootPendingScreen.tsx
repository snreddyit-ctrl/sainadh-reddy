import React, { useState } from 'react';
import {
  Building2,
  ArrowLeft,
  Settings,
  Download,
  Printer,
  Receipt,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { Invoice, RootPendingSummary } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadRootPendingBillsCsv } from '../utils/exportBills';
import { printRootPendingBills, getPFStatus } from '../utils/printPendingBills';

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const totalPendingAllRoots = rootPendingList.reduce((sum, r) => sum + r.pendingAmount, 0);
  const totalBilledAllRoots = rootPendingList.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPaidAllRoots = rootPendingList.reduce((sum, r) => sum + r.paidAmount, 0);

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'Pending' || i.status === 'Part Paid' || i.amountPending > 0
  );

  const handleDownloadAll = () => {
    if (onOpenDownloadModal) {
      onOpenDownloadModal('All');
    } else {
      downloadRootPendingBillsCsv('All', invoices);
    }
  };

  const handlePrintAll = () => {
    printRootPendingBills('All', invoices);
  };

  const handlePrintRoot = (e: React.MouseEvent, rootName: string) => {
    e.stopPropagation();
    printRootPendingBills(rootName, invoices);
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
              Root-wise Pending Bills
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SL.NO • Bill No • Bill Date • Amount Paid • P/F • Bill Amount
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Table / Card View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Full Table View (SL.NO, Bill No, Bill Date, Amount Paid, P/F, Bill Amount)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintAll}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
            title="Print pending bills statement"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAll}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
            title="Download pending bills CSV"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenManageRoots}
            className="p-2 sm:px-3 sm:py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
            title="Manage Route Names"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Manage Roots</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Outstanding Balance
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">
            {formatCurrency(totalPendingAllRoots)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across {pendingInvoices.length} unpaid customer bills
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Collected / Amount Paid
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {formatCurrency(totalPaidAllRoots)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total Billed: {formatCurrency(totalBilledAllRoots)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Active Routes
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {rootPendingList.length} <span className="text-sm font-normal text-slate-500">routes</span>
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {rootPendingList.filter((r) => r.pendingAmount === 0).length} routes fully settled
          </p>
        </div>
      </div>

      {/* FULL TABLE VIEW (Exact format: SL.NO, Bill No, Bill Date, Amount Paid, P/F, Bill Amount, Balance) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-blue-600" />
              <span>Master Pending Bills Table</span>
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <strong>P</strong> = Part Paid
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <strong>F</strong> = Full Pending
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">SL.NO</th>
                  <th className="py-3 px-3">Root</th>
                  <th className="py-3 px-3 text-center">Bill No</th>
                  <th className="py-3 px-3 text-center">Bill Date</th>
                  <th className="py-3 px-3 text-right">Amount Paid</th>
                  <th className="py-3 px-3 text-center w-14">P/F</th>
                  <th className="py-3 px-3 text-right">Bill Amount</th>
                  <th className="py-3 px-3 text-right">Amount Pending</th>
                  <th className="py-3 px-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                      All customer invoices are fully settled!
                    </td>
                  </tr>
                ) : (
                  pendingInvoices.map((inv, idx) => {
                    const pf = getPFStatus(inv);
                    return (
                      <tr
                        key={`${inv.billNo}-${idx}`}
                        onClick={() => onSelectInvoice(inv)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{inv.root}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">#{inv.billNo}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{formatDate(inv.billDate)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                          {formatCurrency(inv.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              pf === 'P'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {pf}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(inv.billAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-red-600">
                          {formatCurrency(inv.amountPending)}
                        </td>
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onQuickPayment(inv.billNo)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-md text-[11px] font-bold border border-emerald-200 transition-colors"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-3">
                    TOTAL ({pendingInvoices.length} BILLS)
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700">
                    {formatCurrency(totalPaidAllRoots)}
                  </td>
                  <td className="py-3 px-3 text-center">-</td>
                  <td className="py-3 px-3 text-right">
                    {formatCurrency(totalBilledAllRoots)}
                  </td>
                  <td className="py-3 px-3 text-right text-red-700">
                    {formatCurrency(totalPendingAllRoots)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Root Cards */
        <div className="space-y-4">
          {rootPendingList.map((item) => {
            const rootInvoices = invoices.filter(
              (i) => i.root.toLowerCase() === item.root.toLowerCase()
            );
            const pendingRootInvoices = rootInvoices
              .filter((i) => i.status === 'Pending' || i.status === 'Part Paid' || i.amountPending > 0)
              .sort((a, b) => a.billNo.localeCompare(b.billNo, undefined, { numeric: true }));

            return (
              <div
                key={item.root}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Root Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
                      {item.root.charAt(0) || 'R'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{item.root}</h3>
                      <span className="text-xs text-slate-500">
                        {item.billCount} total bills ({item.pendingCount} pending)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => handlePrintRoot(e, item.root)}
                      disabled={pendingRootInvoices.length === 0}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                      title={`Print pending report for ${item.root}`}
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadRoot(e, item.root)}
                      disabled={pendingRootInvoices.length === 0}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                      title={`Download pending bills CSV for ${item.root}`}
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>CSV</span>
                    </button>

                    <div className="text-right pl-2 border-l border-slate-200">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Pending Balance</div>
                      <div className="text-base font-bold text-red-600">
                        {formatCurrency(item.pendingAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table of Bills in this root: SL.NO, Bill No, Bill Date, Amount Paid, P/F, Bill Amount */}
                <div className="p-4">
                  {pendingRootInvoices.length === 0 ? (
                    <div className="py-4 text-center text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-xl border border-emerald-100">
                      All customer bills for {item.root} are fully settled.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-extrabold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">SL.NO</th>
                            <th className="py-2.5 px-3 text-center">Bill No</th>
                            <th className="py-2.5 px-3 text-center">Bill Date</th>
                            <th className="py-2.5 px-3 text-right">Amount Paid</th>
                            <th className="py-2.5 px-3 text-center w-14">P/F</th>
                            <th className="py-2.5 px-3 text-right">Bill Amount</th>
                            <th className="py-2.5 px-3 text-right">Pending Balance</th>
                            <th className="py-2.5 px-3 text-center w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {pendingRootInvoices.map((inv, idx) => {
                            const pf = getPFStatus(inv);
                            return (
                              <tr
                                key={`${inv.billNo}-${idx}`}
                                onClick={() => onSelectInvoice(inv)}
                                className="hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <td className="py-2.5 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-900">#{inv.billNo}</td>
                                <td className="py-2.5 px-3 text-center text-slate-600">{formatDate(inv.billDate)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                                  {formatCurrency(inv.amountPaid)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                                      pf === 'P'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {pf}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  {formatCurrency(inv.billAmount)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-red-600">
                                  {formatCurrency(inv.amountPending)}
                                </td>
                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => onQuickPayment(inv.billNo)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-md text-[11px] font-bold border border-emerald-200 transition-colors"
                                  >
                                    Pay
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-extrabold text-slate-900 text-xs">
                          <tr>
                            <td colSpan={3} className="py-2.5 px-3">
                              SUBTOTAL ({pendingRootInvoices.length} BILLS)
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">
                              {formatCurrency(item.paidAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">-</td>
                            <td className="py-2.5 px-3 text-right">
                              {formatCurrency(item.totalAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-red-700">
                              {formatCurrency(item.pendingAmount)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
