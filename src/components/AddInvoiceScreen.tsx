import React, { useState } from 'react';
import { PlusCircle, CheckCircle2, AlertCircle, Calendar, Hash, MapPin, Plus, Settings } from 'lucide-react';
import { Invoice } from '../types';
import { calculateInvoiceCalculations, formatCurrency, getTodayDateString, validateBillNumber } from '../utils/format';

interface AddInvoiceScreenProps {
  roots: string[];
  existingInvoices: Invoice[];
  onSaveInvoice: (invoiceData: {
    billNo: string;
    root: string;
    billDate: string;
    billAmount: number;
    amountPaid: number;
  }) => Promise<{ success: boolean; message?: string }>;
  onAddNewRoot: (rootName: string) => Promise<boolean>;
  onNavigateToBills?: () => void;
  onOpenManageRoots?: () => void;
}

export const AddInvoiceScreen: React.FC<AddInvoiceScreenProps> = ({
  roots,
  existingInvoices,
  onSaveInvoice,
  onAddNewRoot,
  onNavigateToBills,
  onOpenManageRoots,
}) => {
  const [billNo, setBillNo] = useState('');
  const [root, setRoot] = useState(roots[0] || 'Pattapuram');
  const [billDate, setBillDate] = useState(getTodayDateString());
  const [billAmount, setBillAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('0');

  // Custom Root modal / state
  const [isAddingCustomRoot, setIsAddingCustomRoot] = useState(false);
  const [customRootName, setCustomRootName] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parse numeric values for live calculation preview
  const numBillAmount = Math.max(0, parseFloat(billAmount) || 0);
  const numAmountPaid = Math.max(0, parseFloat(amountPaid) || 0);
  const { amountPending, status } = calculateInvoiceCalculations(numBillAmount, numAmountPaid);

  // Check if duplicate bill number entered in real-time
  const cleanBillNo = billNo.trim();
  const isDuplicate = cleanBillNo ? existingInvoices.some((inv) => inv.billNo === cleanBillNo) : false;

  // Handle Bill No input: numbers only
  const handleBillNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/\D/g, '');
    setBillNo(sanitized);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Handle Bill Amount input: numbers only
  const handleBillAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9.]/g, '');
    setBillAmount(sanitized);
    setErrorMessage(null);
  };

  // Handle Amount Paid input: numbers only
  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9.]/g, '');
    setAmountPaid(sanitized);
    setErrorMessage(null);
  };

  // Add custom root handler
  const handleCreateRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRootName.trim()) return;
    const ok = await onAddNewRoot(customRootName.trim());
    if (ok) {
      setRoot(customRootName.trim());
      setCustomRootName('');
      setIsAddingCustomRoot(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validate Bill No
    const billValidation = validateBillNumber(billNo);
    if (!billValidation.isValid) {
      setErrorMessage(billValidation.error || 'Invalid Bill No');
      return;
    }

    // 2. Check for duplicate Bill No
    if (isDuplicate) {
      setErrorMessage('This Bill No already exists. Do not create a duplicate invoice.');
      return;
    }

    // 3. Validate Root
    if (!root.trim()) {
      setErrorMessage('Please select a Root.');
      return;
    }

    // 4. Validate Date
    if (!billDate) {
      setErrorMessage('Please select a Bill Date.');
      return;
    }

    // 5. Validate Bill Amount
    if (numBillAmount <= 0) {
      setErrorMessage('Bill Amount must be a positive number greater than 0.');
      return;
    }

    // 6. Validate Amount Paid
    if (numAmountPaid < 0) {
      setErrorMessage('Amount Paid cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await onSaveInvoice({
        billNo: cleanBillNo,
        root: root.trim(),
        billDate,
        billAmount: numBillAmount,
        amountPaid: numAmountPaid,
      });

      if (res.success) {
        setSuccessMessage('Invoice saved successfully to Google Sheets.');
        setBillNo('');
        setBillAmount('');
        setAmountPaid('0');
        setBillDate(getTodayDateString());
      } else {
        setErrorMessage(res.message || 'Failed to save invoice.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-700" />
          Add Invoice
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter new billing entry. Pending balance & status are calculated automatically.
        </p>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm">{successMessage}</div>
            <div className="text-xs text-emerald-700 mt-0.5">
              The invoice is now saved and synchronized with your records.
            </div>
            {onNavigateToBills && (
              <button
                type="button"
                onClick={onNavigateToBills}
                className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
              >
                View in All Bills →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Cannot Save Invoice</div>
            <div className="text-xs text-red-700 mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Duplicate warning */}
      {isDuplicate && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Bill No #{cleanBillNo} already exists in database. Duplicate bill numbers not allowed.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* 1. Bill No */}
          <div>
            <label htmlFor="billNo" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Bill No <span className="text-red-500">*</span>
            </label>
            <input
              id="billNo"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={billNo}
              onChange={handleBillNoChange}
              placeholder="e.g. 1006"
              className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                isDuplicate
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500'
              }`}
              required
            />
          </div>

          {/* 2. Root */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="root" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Root <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomRoot(!isAddingCustomRoot)}
                  className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Root</span>
                </button>
                {onOpenManageRoots && (
                  <button
                    type="button"
                    onClick={onOpenManageRoots}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                )}
              </div>
            </div>

            {isAddingCustomRoot && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2.5 flex items-center gap-2">
                <input
                  type="text"
                  value={customRootName}
                  onChange={(e) => setCustomRootName(e.target.value)}
                  placeholder="Enter new root name..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={handleCreateRoot}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomRoot(false)}
                  className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            <select
              id="root"
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            >
              {roots.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Bill Date */}
          <div>
            <label htmlFor="billDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Bill Date <span className="text-red-500">*</span>
            </label>
            <input
              id="billDate"
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          {/* 4. Bill Amount */}
          <div>
            <label htmlFor="billAmount" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Bill Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="billAmount"
                type="text"
                inputMode="decimal"
                value={billAmount}
                onChange={handleBillAmountChange}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          {/* 5. Amount Paid */}
          <div>
            <label htmlFor="amountPaid" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Amount Paid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="amountPaid"
                type="text"
                inputMode="decimal"
                value={amountPaid}
                onChange={handleAmountPaidChange}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Automatic Live Calculation Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Calculation Summary (Read Only)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-800 p-3 rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Amount Pending</div>
              <div className="text-lg sm:text-xl font-bold text-red-400 mt-0.5">
                {formatCurrency(amountPending)}
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Calculated Status</div>
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    status === 'Paid'
                      ? 'bg-green-100 text-green-800'
                      : status === 'Part Paid'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="save-invoice-btn"
          disabled={isSubmitting || isDuplicate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 uppercase tracking-wide text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>SAVING INVOICE...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              <span>SAVE INVOICE</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
