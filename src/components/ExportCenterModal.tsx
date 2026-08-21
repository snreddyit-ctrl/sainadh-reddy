import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileArchive,
  FileJson,
  FileText,
  Building2,
  CheckCircle2,
  Receipt,
  ArrowDownToLine,
  Layers,
  Sparkles,
  Code2,
} from 'lucide-react';
import { Invoice } from '../types';
import { downloadRootPendingBillsCsv } from '../utils/exportBills';
import { downloadAllProjectDataZip } from '../utils/exportZip';
import { formatCurrency } from '../utils/format';

interface ExportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  roots: string[];
}

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  isOpen,
  onClose,
  invoices,
  roots,
}) => {
  const [selectedRoot, setSelectedRoot] = useState<string>('All');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'Pending' || i.status === 'Part Paid' || i.amountPending > 0
  );
  const totalPendingAmount = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  const handleDownloadProjectSourceCode = async () => {
    try {
      setIsDownloadingSource(true);
      const response = await fetch('/api/export-project-source');
      if (!response.ok) {
        throw new Error('Failed to generate source code ZIP');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vijaya_agencies_source_code_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showNotice('Downloaded full Project Source Code ZIP!');
    } catch (err: any) {
      alert('Could not download project source ZIP: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDownloadingSource(false);
    }
  };

  const handleDownloadRootWiseCsv = () => {
    downloadRootPendingBillsCsv(selectedRoot, invoices);
    showNotice(`Downloaded ${selectedRoot === 'All' ? 'All Routes' : selectedRoot} Pending Bills CSV!`);
  };

  const handleDownloadAllInvoicesCsv = () => {
    const headers = ['Bill No', 'Root', 'Bill Date', 'Bill Amount', 'Amount Paid', 'Amount Pending', 'Status'];
    const rows = invoices.map((inv) => [
      `"${inv.billNo}"`,
      `"${inv.root.replace(/"/g, '""')}"`,
      `"${inv.billDate}"`,
      inv.billAmount,
      inv.amountPaid,
      inv.amountPending,
      `"${inv.status}"`,
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `VIJAYA_AGENCIES_All_Invoices_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice('Downloaded All Invoices CSV!');
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          businessName: 'VIJAYA AGENCIES',
          totalInvoices: invoices.length,
          roots: roots,
          invoices: invoices,
        },
        null,
        2
      )
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `VIJAYA_AGENCIES_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotice('Downloaded JSON Database Backup!');
  };

  const handleDownloadZipBundle = async () => {
    try {
      setIsExportingZip(true);
      await downloadAllProjectDataZip(invoices, roots);
      showNotice('Downloaded complete ZIP package containing all CSVs, folders & backups!');
    } catch (err) {
      alert('Failed to generate ZIP. Please try downloading CSV directly.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const showNotice = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Download & Export Center</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Download pending bills, Excel/CSV sheets, and full project archives
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Card 0: Download Project Source Code ZIP */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-400/30">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm">
                    Project Source Code (.ZIP)
                  </h4>
                  <span className="text-[10px] bg-blue-500 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Full Codebase
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Export all project files (React components, TypeScript, Express server, Google Apps Script, configs, and assets).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadProjectSourceCode}
              disabled={isDownloadingSource}
              className="px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingSource ? 'Packing Source...' : 'Download Code ZIP'}</span>
            </button>
          </div>

          {/* Card 1: Primary Feature: Route-Wise Pending Bills */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-600 text-white tracking-wide">
                    Requested Format
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Root-Wise Pending Bills (.CSV / Excel)
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Format: <strong>Bill No • Bill Date • Bill Amount • Amount Paid • Amount Pending</strong>
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-blue-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <select
                  value={selectedRoot}
                  onChange={(e) => setSelectedRoot(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="All">All Routes ({pendingInvoices.length} pending bills)</option>
                  {roots.map((r) => {
                    const c = invoices.filter(
                      (i) => i.root.toLowerCase() === r.toLowerCase() && i.amountPending > 0
                    ).length;
                    return (
                      <option key={r} value={r}>
                        {r} ({c} pending)
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDownloadRootWiseCsv}
                disabled={pendingInvoices.length === 0}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Download Pending CSV</span>
              </button>
            </div>
          </div>

          {/* Card 2: Complete Project ZIP Package */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <FileArchive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Complete Project ZIP Archive</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                    All-in-One
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Includes all root CSVs, master invoice ledger, JSON database backup, and Apps Script code.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadZipBundle}
              disabled={isExportingZip}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <FileArchive className="w-4 h-4" />
              <span>{isExportingZip ? 'Packing...' : 'Download ZIP'}</span>
            </button>
          </div>

          {/* Grid of Other File Formats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* All Invoices Master CSV */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <div>
                  <h5 className="font-bold text-xs text-slate-900">All Invoices Master Ledger</h5>
                  <p className="text-[11px] text-slate-400">{invoices.length} total records (CSV)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadAllInvoicesCsv}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                title="Download All Invoices CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* JSON Database Backup */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileJson className="w-4 h-4 text-indigo-600" />
                <div>
                  <h5 className="font-bold text-xs text-slate-900">JSON Database File</h5>
                  <p className="text-[11px] text-slate-400">Full structured database backup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                title="Download JSON Database"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current Pending Total: <strong className="text-red-600">{formatCurrency(totalPendingAmount)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
