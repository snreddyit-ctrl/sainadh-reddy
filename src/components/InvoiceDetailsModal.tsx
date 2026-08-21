import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Edit3,
  Trash2,
  Share2,
  MapPin,
  Calendar,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { Invoice } from '../types';
import { calculateInvoiceCalculations, formatCurrency, formatDate } from '../utils/format';

interface InvoiceDetailsModalProps {
  invoice: Invoice | null;
  roots: string[];
  isOpen: boolean;
  onClose: () => void;
  onOpenPaymentForInvoice: (billNo: string) => void;
  onUpdateInvoice: (billNo: string, data: Partial<Invoice>) => Promise<boolean>;
  onDeleteRequest: (invoice: Invoice) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  roots,
  isOpen,
  onClose,
  onOpenPaymentForInvoice,
  onUpdateInvoice,
  onDeleteRequest,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editRoot, setEditRoot] = useState('');
  const [editBillDate, setEditBillDate] = useState('');
  const [editBillAmount, setEditBillAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen || !invoice) return null;

  // Initialize edit fields
  const startEditing = () => {
    setEditRoot(invoice.root);
    setEditBillDate(invoice.billDate);
    setEditBillAmount(String(invoice.billAmount));
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(editBillAmount) || invoice.billAmount;
    setIsSaving(true);
    const success = await onUpdateInvoice(invoice.billNo, {
      root: editRoot,
      billDate: editBillDate,
      billAmount: numAmount,
    });
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  // WhatsApp share format
  const handleShare = () => {
    const text = `*VIJAYA AGENCIES - BILL VOUCHER*\n\n*Bill No:* #${invoice.billNo}\n*Root:* ${invoice.root}\n*Bill Date:* ${invoice.billDate}\n*Total Bill Amount:* ${formatCurrency(invoice.billAmount)}\n*Amount Paid:* ${formatCurrency(invoice.amountPaid)}\n*Amount Pending:* ${formatCurrency(invoice.amountPending)}\n*Status:* ${invoice.status}\n\nThank you for doing business with VIJAYA AGENCIES.`;
    navigator.clipboard?.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Invoice #{invoice.billNo}</h3>
              <p className="text-[11px] text-slate-400">VIJAYA AGENCIES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {copiedNotification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Invoice summary copied to clipboard for sharing!</span>
            </div>
          )}

          {!isEditing ? (
            /* View Mode */
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Bill Number
                    </span>
                    <span className="text-2xl font-bold text-slate-900">
                      #{invoice.billNo}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Root:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {invoice.root}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bill Date:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(invoice.billDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Payment Ledger
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Total Bill Amount:</span>
                    <span className="text-base font-bold text-white">
                      {formatCurrency(invoice.billAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-semibold">
                    <span>Total Amount Paid:</span>
                    <span className="text-base">
                      {formatCurrency(invoice.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-red-400 font-bold">Outstanding Pending:</span>
                    <span className="text-xl font-bold text-red-400">
                      {formatCurrency(invoice.amountPending)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="pt-1">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, (invoice.amountPaid / invoice.billAmount) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {invoice.amountPending > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPaymentForInvoice(invoice.billNo);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Payment</span>
                  </button>
                ) : (
                  <div className="py-2.5 px-3 bg-green-50 text-green-800 text-xs font-bold text-center rounded-xl border border-green-100">
                    ✓ Invoice is fully settled.
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={startEditing}
                    className="py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteRequest(invoice)}
                    className="py-2 px-3 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-semibold">
                Editing Invoice #{invoice.billNo}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Root</label>
                <select
                  value={editRoot}
                  onChange={(e) => setEditRoot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {roots.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bill Date</label>
                <input
                  type="date"
                  value={editBillDate}
                  onChange={(e) => setEditBillDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Bill Amount (Total)
                </label>
                <input
                  type="number"
                  value={editBillAmount}
                  onChange={(e) => setEditBillAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
