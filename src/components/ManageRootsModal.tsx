import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency } from '../utils/format';

interface ManageRootsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roots: string[];
  invoices: Invoice[];
  onAddNewRoot: (rootName: string) => Promise<boolean>;
  onUpdateRoot: (oldRootName: string, newRootName: string) => Promise<boolean>;
  onDeleteRoot: (rootName: string) => Promise<boolean>;
}

export const ManageRootsModal: React.FC<ManageRootsModalProps> = ({
  isOpen,
  onClose,
  roots,
  invoices,
  onAddNewRoot,
  onUpdateRoot,
  onDeleteRoot,
}) => {
  const [newRootName, setNewRootName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoot, setEditingRoot] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Add new root
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRootName.trim();
    if (!clean) {
      setFeedback({ type: 'error', message: 'Root name cannot be empty.' });
      return;
    }

    if (roots.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      setFeedback({ type: 'error', message: `Root "${clean}" already exists.` });
      return;
    }

    setIsAdding(true);
    setFeedback(null);
    try {
      const ok = await onAddNewRoot(clean);
      if (ok) {
        setNewRootName('');
        setFeedback({ type: 'success', message: `Root "${clean}" added successfully!` });
      } else {
        setFeedback({ type: 'error', message: 'Failed to add root.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error adding root.' });
    } finally {
      setIsAdding(false);
    }
  };

  // Start editing
  const startEdit = (root: string) => {
    setEditingRoot(root);
    setEditedName(root);
    setFeedback(null);
  };

  // Save edited root
  const handleSaveEdit = async (oldName: string) => {
    const clean = editedName.trim();
    if (!clean) {
      setFeedback({ type: 'error', message: 'Root name cannot be empty.' });
      return;
    }

    if (clean.toLowerCase() !== oldName.toLowerCase() && roots.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      setFeedback({ type: 'error', message: `Root "${clean}" already exists.` });
      return;
    }

    setIsUpdating(true);
    setFeedback(null);
    try {
      const ok = await onUpdateRoot(oldName, clean);
      if (ok) {
        setEditingRoot(null);
        setFeedback({ type: 'success', message: `Root renamed to "${clean}" successfully!` });
      } else {
        setFeedback({ type: 'error', message: 'Failed to rename root.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating root.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm delete root
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const ok = await onDeleteRoot(deleteTarget);
      if (ok) {
        setFeedback({ type: 'success', message: `Root "${deleteTarget}" deleted successfully.` });
        setDeleteTarget(null);
      } else {
        setFeedback({ type: 'error', message: `Failed to delete root "${deleteTarget}".` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error deleting root.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Manage Distribution Roots</h3>
              <p className="text-[11px] text-slate-400">Add, edit, or delete distribution routes</p>
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Add New Root Form */}
          <form onSubmit={handleAddSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label htmlFor="newRootInput" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Add New Distribution Route
            </label>
            <div className="flex gap-2">
              <input
                id="newRootInput"
                type="text"
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                placeholder="e.g. Guntur, Karimnagar, Warangal..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={isAdding || !newRootName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAdding ? 'Adding...' : 'Add Root'}</span>
              </button>
            </div>
          </form>

          {/* Registered Roots List with Detailed Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[11px] px-1">
              <span>Registered Roots ({roots.length})</span>
              <span>Invoice Breakdown</span>
            </div>

            {roots.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No routes registered. Add your first route above.
              </div>
            ) : (
              <div className="space-y-2">
                {roots.map((rootName) => {
                  const rootInvoices = invoices.filter((i) => i.root.toLowerCase() === rootName.toLowerCase());
                  const totalBilled = rootInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
                  const totalPaid = rootInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
                  const totalPending = rootInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);
                  const unpaidCount = rootInvoices.filter((i) => i.status === 'Pending' || i.status === 'Part Paid').length;

                  const isEditingThis = editingRoot === rootName;

                  return (
                    <div
                      key={rootName}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-slate-50 border border-blue-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(rootName)}
                              disabled={isUpdating}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                              title="Save name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoot(null)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {rootName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{rootName}</div>
                              <div className="text-[10px] text-slate-500">
                                {rootInvoices.length} {rootInvoices.length === 1 ? 'bill' : 'bills'} (
                                {unpaidCount === 0 ? (
                                  <span className="text-emerald-600 font-semibold">Fully settled</span>
                                ) : (
                                  <span className="text-red-600 font-semibold">{unpaidCount} unpaid</span>
                                )}
                                )
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditingThis && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(rootName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title={`Edit / Rename ${rootName}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(rootName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title={`Delete ${rootName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Financial statistics strip */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-slate-500 block">Total Billed</span>
                          <span className="font-bold text-slate-900">{formatCurrency(totalBilled)}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-slate-500 block">Total Paid</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-slate-500 block">Pending</span>
                          <span className={`font-bold ${totalPending > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {formatCurrency(totalPending)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Root Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Delete Route: {deleteTarget}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove <strong>{deleteTarget}</strong> from your active distribution routes?
                </p>
              </div>
            </div>

            {invoices.filter((i) => i.root.toLowerCase() === deleteTarget.toLowerCase()).length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium space-y-1">
                <p className="font-bold">Notice:</p>
                <p>
                  This route has {invoices.filter((i) => i.root.toLowerCase() === deleteTarget.toLowerCase()).length} existing invoices. Existing bill records will be preserved in history.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Root</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
