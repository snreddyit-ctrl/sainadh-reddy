import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
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
  Mail,
  Clock,
  Send,
  Calendar,
  AlertCircle,
  Settings,
  Key,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Invoice } from '../types';
import { downloadRootPendingBillsCsv } from '../utils/exportBills';
import { printRootPendingBills } from '../utils/printPendingBills';
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
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Daily Email Automation State
  const [recipientEmail, setRecipientEmail] = useState<string>('snreddy.it@gmail.com');
  const [scheduleTime, setScheduleTime] = useState<string>('23:30');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showConfigSettings, setShowConfigSettings] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // SMTP Gmail Setup State
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [smtpUser, setSmtpUser] = useState<string | null>(null);
  const [showSmtpSetup, setShowSmtpSetup] = useState(false);
  const [smtpEmailInput, setSmtpEmailInput] = useState('snreddy.it@gmail.com');
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // Load active schedule settings from server
  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/reports/email-status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.recipientEmail) setRecipientEmail(data.recipientEmail);
          if (data && data.scheduleTime) setScheduleTime(data.scheduleTime);
          if (data && typeof data.isSmtpConfigured === 'boolean') {
            setIsSmtpConfigured(data.isSmtpConfigured);
          }
          if (data && data.smtpUser) {
            setSmtpUser(data.smtpUser);
          }
        })
        .catch((e) => console.error('Error fetching email schedule status:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'Pending' || i.status === 'Part Paid' || i.amountPending > 0
  );
  const totalPendingAmount = pendingInvoices.reduce(
    (sum, i) => sum + (Number(i.amountPending) || 0),
    0
  );

  const handleSaveSmtp = async () => {
    if (!smtpPassInput.trim()) {
      setEmailNotice({
        type: 'error',
        text: 'Please enter your 16-character Google App Password.',
      });
      return;
    }
    try {
      setIsSavingSmtp(true);
      const res = await fetch('/api/reports/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: smtpEmailInput.trim(),
          pass: smtpPassInput.trim(),
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setIsSmtpConfigured(true);
        setSmtpUser(data.smtpUser || smtpEmailInput.trim());
        setShowSmtpSetup(false);
        setSmtpPassInput('');
        setEmailNotice({
          type: 'success',
          text: '✅ Gmail credentials saved! You can now click "Email Excel Report Now" to test live delivery.',
        });
      } else {
        setEmailNotice({
          type: 'error',
          text: data?.message || 'Failed to configure Gmail SMTP.',
        });
      }
    } catch (err: any) {
      setEmailNotice({
        type: 'error',
        text: err?.message || 'Error saving credentials.',
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleSaveReportConfig = async () => {
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/reports/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          scheduleTime: scheduleTime.trim(),
          enabled: true,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setEmailNotice({
          type: 'success',
          text: `Settings Saved! Automated report will be sent daily at ${scheduleTime} IST to ${recipientEmail}.`,
        });
        setShowConfigSettings(false);
      } else {
        setEmailNotice({
          type: 'error',
          text: data?.message || 'Failed to save settings.',
        });
      }
    } catch (err: any) {
      setEmailNotice({
        type: 'error',
        text: err?.message || 'Error updating settings.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendDailyEmailNow = async () => {
    try {
      setIsSendingEmail(true);
      setEmailNotice(null);
      const res = await fetch('/api/reports/daily-excel-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: invoices,
          recipient: recipientEmail.trim() || 'snreddy.it@gmail.com',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailNotice({
          type: data.mode === 'smtp' ? 'success' : 'info',
          text:
            data.message ||
            `Daily report generated for ${recipientEmail} with ${invoices.length} invoices.`,
        });
      } else {
        setEmailNotice({
          type: 'error',
          text: data.message || 'Failed to dispatch email.',
        });
      }
    } catch (err: any) {
      setEmailNotice({
        type: 'error',
        text: err.message || 'Failed to trigger report email.',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadExcelWorkbook = async () => {
    try {
      setIsDownloadingExcel(true);
      const res = await fetch('/api/reports/download-daily-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices }),
      });
      if (!res.ok) throw new Error('Failed to generate Excel file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VIJAYA_AGENCIES_Daily_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showNotice('Downloaded multi-sheet Daily Excel Workbook (.xlsx)!');
    } catch (err: any) {
      alert('Could not download Excel: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handlePrintRootWise = () => {
    printRootPendingBills(selectedRoot, invoices);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Download & Export Center</h3>
              <p className="text-[11px] text-slate-400">
                VIJAYA AGENCIES • Print reports, download spreadsheets & full source code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {downloadSuccess && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Card: Daily Automated 11:30 PM Excel Email Backup */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white border border-indigo-700/60 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700/40 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-400/30">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-sm">
                      Daily Invoices Excel Report ({scheduleTime} IST)
                    </h4>
                    <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Daily at {scheduleTime}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Automated email dispatch containing complete <strong>.xlsx Excel workbook</strong> (All Invoices, Executive Summary & Route Breakdown) to <strong>{recipientEmail || 'snreddy.it@gmail.com'}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Email Dispatch Notice */}
            {emailNotice && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border animate-fadeIn ${
                  emailNotice.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                    : emailNotice.type === 'error'
                    ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                    : 'bg-indigo-950/80 border-indigo-400/40 text-indigo-200'
                }`}
              >
                {emailNotice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">{emailNotice.text}</div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSendDailyEmailNow}
                disabled={isSendingEmail}
                className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSendingEmail ? 'Generating & Dispatching...' : 'Email Excel Report Now'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcelWorkbook}
                disabled={isDownloadingExcel}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>
                  {isDownloadingExcel ? 'Preparing .XLSX...' : 'Download Excel (.xlsx)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigSettings(!showConfigSettings)}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                  showConfigSettings
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-white/10 hover:bg-white/20 text-indigo-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Change Email / Time</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSmtpSetup(!showSmtpSetup)}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                  isSmtpConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>
                  {isSmtpConfigured ? 'Gmail Connected' : 'Setup Gmail Delivery'}
                </span>
              </button>
            </div>

            {/* Outgoing Gmail Setup Panel */}
            {showSmtpSetup && (
              <div className="mt-3 pt-3 border-t border-indigo-700/50 bg-slate-950/90 p-4 rounded-xl border border-amber-500/40 text-xs space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <h5 className="font-bold text-white text-xs">
                      Outgoing Email Setup (Google App Password)
                    </h5>
                  </div>
                  {isSmtpConfigured && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                      Connected: {smtpUser}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  To deliver real emails and Excel attachments straight to your Gmail inbox (<code>{recipientEmail}</code>), Google requires a 16-character <strong>App Password</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide">
                      Sender Gmail Address
                    </label>
                    <input
                      type="email"
                      value={smtpEmailInput}
                      onChange={(e) => setSmtpEmailInput(e.target.value)}
                      placeholder="e.g. snreddy.it@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide flex items-center justify-between">
                      <span>16-Char Google App Password</span>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-0.5 normal-case font-normal text-[10px]"
                      >
                        <span>Generate password</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </label>
                    <input
                      type="password"
                      value={smtpPassInput}
                      onChange={(e) => setSmtpPassInput(e.target.value)}
                      placeholder="e.g. abcd efgh ijkl mnop"
                      className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>How to get your Google App Password in 30 seconds:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-[11px] pl-1">
                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-amber-300 underline font-semibold">myaccount.google.com/apppasswords</a> (make sure 2-Step Verification is ON)</li>
                    <li>Type <strong>Vijaya Agencies</strong> as the app name and click <strong>Create</strong></li>
                    <li>Copy the 16-letter password shown on screen and paste it into the box above</li>
                  </ol>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSmtpSetup(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSmtp}
                    disabled={isSavingSmtp || !smtpPassInput.trim()}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSavingSmtp ? 'Verifying & Saving...' : 'Save Gmail Password'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* In-Modal Configuration Editor: Change Email ID and Time */}
            {showConfigSettings && (
              <div className="mt-3 pt-3 border-t border-indigo-700/50 bg-slate-950/80 p-4 rounded-xl border border-indigo-500/30 text-xs space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <h5 className="font-bold text-white text-xs">
                      Change Delivery Email & Scheduled Time
                    </h5>
                  </div>
                  <span className="text-[10px] text-indigo-300">
                    Saves to system automatically
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. snreddy.it@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Scheduled Time Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide">
                      Daily Delivery Time (IST)
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Times:</span>
                  {[
                    { label: '11:30 PM (Midnight)', val: '23:30' },
                    { label: '11:00 PM', val: '23:00' },
                    { label: '10:00 PM', val: '22:00' },
                    { label: '08:00 AM (Morning)', val: '08:00' },
                    { label: '06:00 PM (Closing)', val: '18:00' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setScheduleTime(p.val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        scheduleTime === p.val
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-indigo-200 hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowConfigSettings(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReportConfig}
                    disabled={isSavingConfig || !recipientEmail.trim()}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSavingConfig ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 1: Primary Feature: Route-Wise Pending Bills */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-600 text-white tracking-wide">
                    Print & CSV Format
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Root-Wise Pending Bills (Print & .CSV)
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Format: <strong>SL.NO • Bill No • Bill Date • Amount Paid • P/F • Bill Amount</strong>
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintRootWise}
                  disabled={pendingInvoices.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRootWiseCsv}
                  disabled={pendingInvoices.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Complete Project Data ZIP Package */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <FileArchive className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Complete Data Archive (.ZIP)
                </h4>
                <p className="text-xs text-slate-500">
                  Includes master CSVs, root breakdown folders, JSON backup, and Google Apps Script sync files.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadZipBundle}
              disabled={isExportingZip}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingZip ? 'Packaging...' : 'Download ZIP'}</span>
            </button>
          </div>

          {/* Card 3: All Invoices Master CSV */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  All Invoices Master Ledger (.CSV)
                </h4>
                <p className="text-xs text-slate-500">
                  Full dataset of {invoices.length} invoices with all statuses (Paid, Part Paid, Pending).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadAllInvoicesCsv}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Card 4: JSON Backup */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 border border-indigo-200">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Full Database Backup (.JSON)
                </h4>
                <p className="text-xs text-slate-500">
                  Raw JSON dump for database migration or secure offline storage.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total Outstanding: <strong className="text-red-600">{formatCurrency(totalPendingAmount)}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
