import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Search, AlertTriangle, Hash } from 'lucide-react';
import { Invoice } from '../types';
import { calculateInvoiceCalculations, formatCurrency } from '../utils/format';

interface AddPaymentScreenProps {
  invoices: Invoice[];
  initialBillNo?: string;
  onRecordPayment: (billNo: string, currentPayment: number) => Promise<{ success: boolean; message?: string }>;
  onNavigateToBills?: () => void;
}

export const AddPaymentScreen: React.FC<AddPaymentScreenProps> = ({
  invoices,
  initialBillNo,
  onRecordPayment,
  onNavigateToBills,
}) => {
  const [selectedBillNo, setSelectedBillNo] = useState(initialBillNo || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPayment, setCurrentPayment] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverpayWarning, setShowOverpayWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<{
    billNo: string;
    paidNow: number;
    totalPaid: number;
    pending: number;
    status: string;
  } | null>(null);

  // Sync initialBillNo prop
  useEffect(() => {
    if (initialBillNo) {
      setSelectedBillNo(initialBillNo);
      setSearchQuery(initialBillNo);
    }
  }, [initialBillNo]);

  // Find matching invoice
  const matchedInvoice = invoices.find((inv) => inv.billNo === selectedBillNo);

  // Filter invoices for picker
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.billNo.toLowerCase().includes(q) ||
      inv.root.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q)
    );
  });

  // Calculate new values in real time
  const numCurrentPayment = Math.max(0, parseFloat(currentPayment) || 0);
  const previousPaid = matchedInvoice ? matchedInvoice.amountPaid : 0;
  const billAmount = matchedInvoice ? matchedInvoice.billAmount : 0;
  const previousPending = matchedInvoice ? matchedInvoice.amountPending : 0;

  const newAmountPaid = previousPaid + numCurrentPayment;
  const { amountPending: newAmountPending, status: newStatus } = matchedInvoice
    ? calculateInvoiceCalculations(billAmount, newAmountPaid)
    : { amountPending: 0, status: 'Pending' as const };

  // Handle current payment input: numbers only
  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9.]/g, '');
    setCurrentPayment(sanitized);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Submit payment handler
  const handleProceedPayment = async () => {
    if (!matchedInvoice) {
      setErrorMessage('Please select a valid invoice.');
      return;
    }

    if (numCurrentPayment <= 0) {
      setErrorMessage('Please enter a payment amount greater than 0.');
      return;
    }

    // Check if overpaying pending balance
    if (numCurrentPayment > previousPending && !showOverpayWarning) {
      setShowOverpayWarning(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await onRecordPayment(matchedInvoice.billNo, numCurrentPayment);
      if (res.success) {
        setSuccessMessage('Payment recorded successfully.');
        setPaymentReceiptInfo({
          billNo: matchedInvoice.billNo,
          paidNow: numCurrentPayment,
          totalPaid: newAmountPaid,
          pending: newAmountPending,
          status: newStatus,
        });
        setCurrentPayment('');
        setShowOverpayWarning(false);
      } else {
        setErrorMessage(res.message || 'Failed to record payment.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProceedPayment();
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Add Payment
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Record customer payment. Amounts are added cumulatively to previous payments.
        </p>
      </div>

      {/* Success Notification */}
      {successMessage && paymentReceiptInfo && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-sm">{successMessage}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Bill No:</span>
              <span className="font-bold text-slate-900">#{paymentReceiptInfo.billNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Payment Added:</span>
              <span className="font-bold text-emerald-700">+{formatCurrency(paymentReceiptInfo.paidNow)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Paid So Far:</span>
              <span className="font-bold text-slate-900">{formatCurrency(paymentReceiptInfo.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Remaining Pending:</span>
              <span className="font-bold text-red-600">{formatCurrency(paymentReceiptInfo.pending)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-emerald-100">
              <span className="text-slate-600">New Status:</span>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-green-100 text-green-800">
                {paymentReceiptInfo.status}
              </span>
            </div>
          </div>

          {onNavigateToBills && (
            <button
              onClick={onNavigateToBills}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline pt-1 block"
            >
              View Invoices List →
            </button>
          )}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Payment Error</div>
            <div className="text-xs text-red-700 mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Overpayment Warning */}
      {showOverpayWarning && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-300 text-orange-950 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-orange-900">
                Payment exceeds pending balance
              </div>
              <div className="text-xs text-orange-800 mt-1">
                Outstanding amount is {formatCurrency(previousPending)}, but you entered {formatCurrency(numCurrentPayment)}.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-orange-200">
            <button
              type="button"
              onClick={() => setShowOverpayWarning(false)}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedPayment}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Save Anyway
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Bill No Selection / Search */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Invoice <span className="text-red-500">*</span>
            </label>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter Bill No or Root..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={selectedBillNo}
              onChange={(e) => {
                setSelectedBillNo(e.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            >
              <option value="">-- Choose an Invoice --</option>
              {filteredInvoices.map((inv) => (
                <option key={inv.billNo} value={inv.billNo}>
                  #{inv.billNo} - {inv.root} (Pending: {formatCurrency(inv.amountPending)} - {inv.status})
                </option>
              ))}
            </select>
          </div>

          {/* Display Details of Selected Invoice */}
          {matchedInvoice && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Selected Invoice:</span>
                <span className="font-bold text-slate-900 text-sm">
                  #{matchedInvoice.billNo} ({matchedInvoice.root})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Billed:</span>
                <span className="font-bold text-slate-900">{formatCurrency(matchedInvoice.billAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Previously Paid:</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(matchedInvoice.amountPaid)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Outstanding Balance:</span>
                <span className="font-bold text-red-600 text-sm">
                  {formatCurrency(matchedInvoice.amountPending)}
                </span>
              </div>
            </div>
          )}

          {/* Current Payment Input */}
          <div>
            <label htmlFor="currentPayment" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="currentPayment"
                type="text"
                inputMode="decimal"
                value={currentPayment}
                onChange={handlePaymentChange}
                placeholder="Enter amount"
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>
        </div>

        {/* Live Calculation Preview */}
        {matchedInvoice && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Payment Live Addition
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Previous Paid:</span>
                <span className="font-medium">{formatCurrency(previousPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-semibold">
                <span>+ Payment Today:</span>
                <span>+{formatCurrency(numCurrentPayment)}</span>
              </div>
              <div className="flex justify-between items-center text-white font-bold pt-1 border-t border-slate-800">
                <span>= New Amount Paid:</span>
                <span>{formatCurrency(newAmountPaid)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">New Pending</div>
                <div className="text-base font-bold text-red-400 mt-0.5">
                  {formatCurrency(newAmountPending)}
                </div>
              </div>

              <div className="bg-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">New Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      newStatus === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : newStatus === 'Part Paid'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {newStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Button */}
        <button
          type="submit"
          id="record-payment-btn"
          disabled={isSubmitting || !selectedBillNo || numCurrentPayment <= 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 uppercase tracking-wide text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>RECORDING PAYMENT...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>RECORD PAYMENT</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
