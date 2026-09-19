import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  Filter,
  Receipt,
  MapPin,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

interface BulkDeletePaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  roots: string[];
  onConfirmBulkDelete: (billNos: string[]) => Promise<{ success: boolean; count: number; message?: string }>;
}

type RangePreset = 'all' | 'last_30' | 'last_60' | 'last_90' | 'custom';

export const BulkDeletePaidModal: React.FC<BulkDeletePaidModalProps> = ({
  isOpen,
  onClose,
  invoices,
  roots,
  onConfirmBulkDelete,
}) => {
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedRoot, setSelectedRoot] = useState<string>('All');
  const [selectedBillNos, setSelectedBillNos] = useState<Set<string>>(new Set());
  const [hasUserManuallyToggled, setHasUserManuallyToggled] = useState<boolean>(false);
  const [confirmedCheck, setConfirmedCheck] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Compute preset date boundaries
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter only Paid invoices matching the criteria
  const matchingPaidInvoices = useMemo(() => {
    // Only completely paid invoices
    let paidList = invoices.filter((inv) => inv.status === 'Paid' || inv.amountPending === 0);

    // Root filter
    if (selectedRoot !== 'All') {
      paidList = paidList.filter((inv) => inv.root === selectedRoot);
    }

    // Date range filter
    if (rangePreset === 'last_30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const cutoff = d.toISOString().split('T')[0];
      paidList = paidList.filter((inv) => inv.billDate >= cutoff);
    } else if (rangePreset === 'last_60') {
      const d = new Date();
      d.setDate(d.getDate() - 60);
      const cutoff = d.toISOString().split('T')[0];
      paidList = paidList.filter((inv) => inv.billDate >= cutoff);
    } else if (rangePreset === 'last_90') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      const cutoff = d.toISOString().split('T')[0];
      paidList = paidList.filter((inv) => inv.billDate >= cutoff);
    } else if (rangePreset === 'custom') {
      if (startDate) {
        paidList = paidList.filter((inv) => inv.billDate >= startDate);
      }
      if (endDate) {
        paidList = paidList.filter((inv) => inv.billDate <= endDate);
      }
    }

    return paidList.sort((a, b) => b.billDate.localeCompare(a.billDate) || b.billNo.localeCompare(a.billNo));
  }, [invoices, selectedRoot, rangePreset, startDate, endDate]);

  // Sync selected bills when matching list updates, unless user manually unchecked
  React.useEffect(() => {
    if (!hasUserManuallyToggled) {
      setSelectedBillNos(new Set(matchingPaidInvoices.map((inv) => inv.billNo)));
    } else {
      // Keep only those still matching
      const validNos = new Set(matchingPaidInvoices.map((i) => i.billNo));
      setSelectedBillNos((prev) => {
        const next = new Set<string>();
        prev.forEach((no) => {
          if (validNos.has(no)) next.add(no);
        });
        return next;
      });
    }
  }, [matchingPaidInvoices, hasUserManuallyToggled]);

  // Reset state on modal open
  React.useEffect(() => {
    if (isOpen) {
      setConfirmedCheck(false);
      setIsDeleting(false);
      setStatusMessage(null);
      setHasUserManuallyToggled(false);
      setRangePreset('all');
      setStartDate('');
      setEndDate('');
      setSelectedRoot('All');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmountSelected = matchingPaidInvoices
    .filter((inv) => selectedBillNos.has(inv.billNo))
    .reduce((sum, inv) => sum + inv.billAmount, 0);

  const isAllSelected =
    matchingPaidInvoices.length > 0 && selectedBillNos.size === matchingPaidInvoices.length;

  const handleToggleAll = () => {
    setHasUserManuallyToggled(true);
    if (isAllSelected) {
      setSelectedBillNos(new Set());
    } else {
      setSelectedBillNos(new Set(matchingPaidInvoices.map((i) => i.billNo)));
    }
  };

  const handleToggleOne = (billNo: string) => {
    setHasUserManuallyToggled(true);
    setSelectedBillNos((prev) => {
      const next = new Set(prev);
      if (next.has(billNo)) {
        next.delete(billNo);
      } else {
        next.add(billNo);
      }
      return next;
    });
  };

  const handleDeleteSubmit = async () => {
    const billNosToDelete = Array.from(selectedBillNos);
    if (billNosToDelete.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one paid bill to delete.' });
      return;
    }

    if (!confirmedCheck) {
      setStatusMessage({
        type: 'error',
        text: 'Please check the confirmation box to proceed with deletion.',
      });
      return;
    }

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const result = await onConfirmBulkDelete(billNosToDelete);
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully deleted ${result.count} paid invoice${result.count === 1 ? '' : 's'}.`,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message || 'Failed to delete paid invoices. Please try again.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred during bulk deletion.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-50 to-slate-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold shadow-2xs border border-red-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Bulk Delete Paid Invoices
              </h2>
              <p className="text-xs text-slate-500">
                Purge fully settled bills by date range and route
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Filter Controls */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Date Range & Route Selection
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Total Paid In DB: <strong>{invoices.filter((i) => i.status === 'Paid').length}</strong>
              </span>
            </div>

            {/* Range Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'all', label: 'All Paid Bills' },
                { id: 'last_30', label: 'Last 30 Days' },
                { id: 'last_60', label: 'Last 60 Days' },
                { id: 'last_90', label: 'Last 90 Days' },
                { id: 'custom', label: 'Custom Range' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setRangePreset(preset.id as RangePreset)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    rangePreset === preset.id
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers & Route Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  From Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    value={startDate}
                    disabled={rangePreset !== 'custom'}
                    onChange={(e) => {
                      setRangePreset('custom');
                      setStartDate(e.target.value);
                    }}
                    className={`w-full pl-8 pr-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-100 ${
                      rangePreset === 'custom'
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  To Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    value={endDate}
                    max={todayStr}
                    disabled={rangePreset !== 'custom'}
                    onChange={(e) => {
                      setRangePreset('custom');
                      setEndDate(e.target.value);
                    }}
                    className={`w-full pl-8 pr-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-100 ${
                      rangePreset === 'custom'
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Route
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={selectedRoot}
                    onChange={(e) => setSelectedRoot(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-100"
                  >
                    <option value="All">All Routes</option>
                    {roots.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Matching Paid Bills
              </span>
              <span className="text-sm font-bold text-slate-900">
                {matchingPaidInvoices.length} {matchingPaidInvoices.length === 1 ? 'Bill' : 'Bills'}
              </span>
            </div>
            <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-red-600 block">
                Selected for Deletion
              </span>
              <span className="text-sm font-bold text-red-700">
                {selectedBillNos.size} of {matchingPaidInvoices.length}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Total Value Cleared
              </span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(totalAmountSelected)}
              </span>
            </div>
          </div>

          {/* List Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleToggleAll}
                disabled={matchingPaidInvoices.length === 0}
                className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-red-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({matchingPaidInvoices.length})</span>
              </button>
              <span className="text-[11px] text-slate-500 font-medium">
                Click checkbox to keep or exclude
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
              {matchingPaidInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No paid invoices match the selected date range and route.
                </div>
              ) : (
                matchingPaidInvoices.map((inv, idx) => {
                  const isChecked = selectedBillNos.has(inv.billNo);
                  return (
                    <div
                      key={`${inv.billNo}-${idx}`}
                      onClick={() => handleToggleOne(inv.billNo)}
                      className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                        isChecked ? 'bg-red-50/30' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOne(inv.billNo)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">#{inv.billNo}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                              PAID
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {inv.root} • {formatDate(inv.billDate)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(inv.billAmount)}</div>
                        <div className="text-[10px] text-emerald-600 font-medium">Settled</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Warning and Confirmation Checkbox */}
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-red-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Deletion is permanent. This will remove all{' '}
                {selectedBillNos.size} selected paid invoices from the system and Google Sheets.
              </span>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-900 font-semibold cursor-pointer pt-1 border-t border-red-200/80">
              <input
                type="checkbox"
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 mt-0.5"
              />
              <span>
                I understand that this action is irreversible and confirm deleting {selectedBillNos.size}{' '}
                paid bill{selectedBillNos.size === 1 ? '' : 's'}.
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDeleteSubmit}
            disabled={isDeleting || selectedBillNos.size === 0 || !confirmedCheck}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting {selectedBillNos.size} Bills...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete {selectedBillNos.size} Paid Bills</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
