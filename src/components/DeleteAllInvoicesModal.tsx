import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  Receipt,
  IndianRupee,
  ShieldAlert,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency } from '../utils/format';
import { useAuth, MASTER_ADMIN_EMAIL } from '../context/AuthContext';

interface DeleteAllInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onConfirmDeleteAll: (options: {
    deletePayments: boolean;
  }) => Promise<{ success: boolean; count: number; paymentsCount?: number; message?: string }>;
}

const REQUIRED_CONFIRM_PHRASE = 'DELETE ALL INVOICES';

export const DeleteAllInvoicesModal: React.FC<DeleteAllInvoicesModalProps> = ({
  isOpen,
  onClose,
  invoices,
  onConfirmDeleteAll,
}) => {
  const { currentUser, userProfile } = useAuth();
  const isAdmin =
    userProfile?.role === 'admin' ||
    (currentUser?.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  const [confirmInput, setConfirmInput] = useState('');
  const [deletePayments, setDeletePayments] = useState(true);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    count: number;
    paymentsCount?: number;
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute metrics for the invoices to be deleted
  const { totalBillAmount, totalAmountPaid, totalPendingAmount, paidCount, pendingCount } =
    useMemo(() => {
      let billAmount = 0;
      let paid = 0;
      let pending = 0;
      let paidB = 0;
      let pendB = 0;

      invoices.forEach((inv) => {
        billAmount += inv.billAmount || 0;
        paid += inv.amountPaid || 0;
        pending += inv.amountPending || 0;
        if (inv.status === 'Paid') {
          paidB++;
        } else {
          pendB++;
        }
      });

      return {
        totalBillAmount: billAmount,
        totalAmountPaid: paid,
        totalPendingAmount: pending,
        paidCount: paidB,
        pendingCount: pendB,
      };
    }, [invoices]);

  const isPhraseMatch =
    confirmInput.trim().toUpperCase() === REQUIRED_CONFIRM_PHRASE.toUpperCase();
  const canSubmit = isPhraseMatch && isAgreed && !isDeleting && isAdmin;

  const handleResetAndClose = () => {
    if (isDeleting) return;
    setConfirmInput('');
    setIsAgreed(false);
    setDeletePayments(true);
    setDeleteResult(null);
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!canSubmit) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await onConfirmDeleteAll({ deletePayments });
      if (res.success) {
        setDeleteResult(res);
      } else {
        setErrorMessage(res.message || 'Failed to delete invoices. Please try again.');
      }
    } catch (err: any) {
      console.error('Delete all error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while deleting invoices.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-red-200 overflow-hidden my-6">
        {/* Top Danger Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-700" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shrink-0 shadow-sm">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Delete All Invoices
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                  Danger Zone
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent Database Reset & Record Purge
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isDeleting}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-40"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Post-Deletion Success State */}
          {deleteResult ? (
            <div className="py-6 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Database Purge Completed
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {deleteResult.message ||
                    `Successfully purged all ${deleteResult.count} invoice records from Firebase Cloud Firestore and server storage.`}
                </p>
                {deleteResult.paymentsCount !== undefined && deleteResult.paymentsCount > 0 && (
                  <p className="text-xs font-semibold text-emerald-700">
                    Also cleared {deleteResult.paymentsCount} associated payment logs.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Close & Return to Management
                </button>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            /* Empty State */
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  No Invoices Found in Database
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  The invoices collection in Cloud Firestore is already completely empty. There are no bills to delete.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Active Deletion Form */
            <>
              {/* Critical Warning Alert Box */}
              <div className="p-4 bg-red-50/90 rounded-2xl border border-red-200 text-red-900 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-black text-red-800 uppercase tracking-wide">
                    Irreversible Action Warning
                  </p>
                  <p className="text-red-700 leading-relaxed">
                    You are about to permanently delete <strong>ALL {invoices.length} invoices</strong> from the live
                    Google Cloud Firestore database and system ledger. Outstanding customer dues and balance trackers will be reset to zero. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Bills</p>
                  <p className="text-base font-black text-slate-900">{invoices.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Billed</p>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {formatCurrency(totalBillAmount)}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Pending Dues</p>
                  <p className="text-sm font-black text-amber-700 truncate">
                    {formatCurrency(totalPendingAmount)}
                  </p>
                  <p className="text-[9px] text-amber-600">{pendingCount} bills</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Settled Paid</p>
                  <p className="text-sm font-black text-emerald-700 truncate">
                    {formatCurrency(totalAmountPaid)}
                  </p>
                  <p className="text-[9px] text-emerald-600">{paidCount} bills</p>
                </div>
              </div>

              {/* Options Section */}
              <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Database Clean-up Options</span>
                </p>
                <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deletePayments}
                    onChange={(e) => setDeletePayments(e.target.checked)}
                    disabled={isDeleting}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">
                      Also delete all payment collection logs & transactions
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Recommended for a clean reset so no orphan payment receipts remain in the database.
                    </p>
                  </div>
                </label>
              </div>

              {/* Admin Access Notice */}
              {!isAdmin && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center space-x-2 text-xs text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Only Administrators ({MASTER_ADMIN_EMAIL}) are authorized to purge the entire invoice database.
                  </span>
                </div>
              )}

              {/* Verification & Safeguards */}
              {isAdmin && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800">
                        Type <span className="text-red-600 font-mono select-all font-black">{REQUIRED_CONFIRM_PHRASE}</span> to confirm:
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfirmInput(REQUIRED_CONFIRM_PHRASE)}
                        disabled={isDeleting}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                      >
                        Auto-fill
                      </button>
                    </div>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      disabled={isDeleting}
                      placeholder={`Type "${REQUIRED_CONFIRM_PHRASE}"`}
                      className={`w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border bg-white transition-all outline-none ${
                        isPhraseMatch
                          ? 'border-red-500 ring-2 ring-red-500/20 text-red-700'
                          : 'border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-slate-800'
                      }`}
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>

                  <label className="flex items-start space-x-2.5 cursor-pointer select-none p-3 bg-red-50/50 rounded-xl border border-red-200/60">
                    <input
                      type="checkbox"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      disabled={isDeleting}
                      className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 font-medium leading-relaxed">
                      I understand that all <strong>{invoices.length} invoice records</strong> will be completely removed from Firebase Cloud Firestore and cannot be recovered.
                    </span>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-800 font-medium">
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!deleteResult && invoices.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleResetAndClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50 text-center"
            >
              Cancel & Keep Invoices
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!canSubmit}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Deleting All Invoices...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete All ({invoices.length}) Invoices</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
