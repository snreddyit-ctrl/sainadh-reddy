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

export interface DeleteRootOptions {
  reassignTo?: string;
  deleteInvoices?: boolean;
}

interface ManageRootsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roots: string[];
  invoices: Invoice[];
  onAddNewRoot: (rootName: string) => Promise<boolean>;
  onUpdateRoot: (oldRootName: string, newRootName: string) => Promise<boolean>;
  onDeleteRoot: (rootName: string, options?: DeleteRootOptions) => Promise<boolean>;
  onDeleteUnusedRoots?: () => Promise<boolean>;
}

export const ManageRootsModal: React.FC<ManageRootsModalProps> = ({
  isOpen,
  onClose,
  roots,
  invoices,
  onAddNewRoot,
  onUpdateRoot,
  onDeleteRoot,
  onDeleteUnusedRoots,
}) => {
  const [newRootName, setNewRootName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoot, setEditingRoot] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Deletion states
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'reassign' | 'deleteBills' | 'unassign'>('reassign');
  const [reassignTargetRoot, setReassignTargetRoot] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk unused roots clean up
  const [isCleaningUnused, setIsCleaningUnused] = useState(false);
  const [confirmCleanUnused, setConfirmCleanUnused] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Compute unused routes (0 invoices attached)
  const unusedRoots = roots.filter((r) => {
    const count = invoices.filter((i) => (i.root || '').trim().toLowerCase() === r.toLowerCase()).length;
    return count === 0;
  });

  // Open delete dialog and setup defaults
  const openDeleteDialog = (rootName: string) => {
    setDeleteTarget(rootName);
    const otherRoots = roots.filter((r) => r.toLowerCase() !== rootName.toLowerCase());
    setReassignTargetRoot(otherRoots.length > 0 ? otherRoots[0] : 'Unassigned');
    setDeleteAction('reassign');
    setFeedback(null);
  };

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

  // Confirm delete root with invoice handling
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const targetBills = invoices.filter(
        (i) => (i.root || '').trim().toLowerCase() === deleteTarget.toLowerCase()
      );

      let options: DeleteRootOptions | undefined = undefined;
      if (targetBills.length > 0) {
        if (deleteAction === 'deleteBills') {
          options = { deleteInvoices: true };
        } else if (deleteAction === 'reassign') {
          options = { reassignTo: reassignTargetRoot || 'Unassigned' };
        } else {
          options = { reassignTo: 'Unassigned' };
        }
      }

      const ok = await onDeleteRoot(deleteTarget, options);
      if (ok) {
        setFeedback({
          type: 'success',
          message: `Route "${deleteTarget}" deleted successfully.${
            targetBills.length > 0
              ? deleteAction === 'deleteBills'
                ? ` Associated ${targetBills.length} bills were permanently deleted.`
                : ` Bills were reassigned to "${deleteAction === 'reassign' ? reassignTargetRoot : 'Unassigned'}".`
              : ''
          }`,
        });
        setDeleteTarget(null);
      } else {
        setFeedback({ type: 'error', message: `Failed to delete route "${deleteTarget}".` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error deleting route.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk remove unused routes
  const handleCleanUnused = async () => {
    if (!onDeleteUnusedRoots) return;
    setIsCleaningUnused(true);
    setFeedback(null);
    try {
      const ok = await onDeleteUnusedRoots();
      if (ok) {
        setFeedback({ type: 'success', message: `Removed unused routes with 0 bills successfully!` });
        setConfirmCleanUnused(false);
      } else {
        setFeedback({ type: 'error', message: 'Failed to clean unused routes.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error cleaning unused routes.' });
    } finally {
      setIsCleaningUnused(false);
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
              <span>Registered Routes ({roots.length})</span>
              {unusedRoots.length > 0 && onDeleteUnusedRoots && (
                <button
                  type="button"
                  onClick={() => setConfirmCleanUnused(true)}
                  className="text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 font-bold normal-case text-[11px]"
                  title="Remove all routes that have 0 invoices"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clean Up {unusedRoots.length} Unused {unusedRoots.length === 1 ? 'Route' : 'Routes'}</span>
                </button>
              )}
            </div>

            {roots.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No routes registered. Add your first route above.
              </div>
            ) : (
              <div className="space-y-2">
                {roots.map((rootName) => {
                  const rootInvoices = invoices.filter((i) => (i.root || '').trim().toLowerCase() === rootName.toLowerCase());
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
                              onClick={() => openDeleteDialog(rootName)}
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
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-base">Delete Route: {deleteTarget}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm the deletion of this route from your distribution list.
                </p>
              </div>
            </div>

            {(() => {
              const targetBills = invoices.filter(
                (i) => (i.root || '').trim().toLowerCase() === deleteTarget.toLowerCase()
              );
              const targetPending = targetBills.reduce((s, b) => s + (b.amountPending || 0), 0);
              const otherRoots = roots.filter((r) => r.toLowerCase() !== deleteTarget.toLowerCase());

              if (targetBills.length === 0) {
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">No active invoices on this route</p>
                    <p>This route has 0 bills. It will be permanently removed from your active routes list.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{targetBills.length} existing bills on this route</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Total pending balance:{' '}
                      <strong className="font-mono text-amber-950">{formatCurrency(targetPending)}</strong>
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                      How would you like to handle these {targetBills.length} bills?
                    </label>

                    {/* Option 1: Reassign */}
                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteAction"
                        checked={deleteAction === 'reassign'}
                        onChange={() => setDeleteAction('reassign')}
                        className="mt-0.5 text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-800 text-xs block">Reassign bills to another route</span>
                        <span className="text-[11px] text-slate-500 block mb-1.5">
                          Move all {targetBills.length} bills to an existing active route.
                        </span>
                        {deleteAction === 'reassign' && (
                          <select
                            value={reassignTargetRoot}
                            onChange={(e) => setReassignTargetRoot(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            {otherRoots.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                            <option value="Unassigned">Unassigned (General)</option>
                          </select>
                        )}
                      </div>
                    </label>

                    {/* Option 2: Unassign */}
                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteAction"
                        checked={deleteAction === 'unassign'}
                        onChange={() => setDeleteAction('unassign')}
                        className="mt-0.5 text-blue-600"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 text-xs block">Mark bills as "Unassigned"</span>
                        <span className="text-[11px] text-slate-500">
                          Keep all bills in history with route set to Unassigned.
                        </span>
                      </div>
                    </label>

                    {/* Option 3: Permanently delete bills */}
                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-red-200 bg-red-50/40 hover:bg-red-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteAction"
                        checked={deleteAction === 'deleteBills'}
                        onChange={() => setDeleteAction('deleteBills')}
                        className="mt-0.5 text-red-600"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-red-800 text-xs block">Delete route and ALL {targetBills.length} bills</span>
                        <span className="text-[11px] text-red-600">
                          Permanently deletes these invoices and payment records. Cannot be undone.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Up Unused Routes Confirmation Modal */}
      {confirmCleanUnused && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-base">Clean Up Unused Routes</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove all <strong>{unusedRoots.length} routes</strong> with 0 bills?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 max-h-36 overflow-y-auto space-y-1">
              <span className="font-semibold text-slate-800 block text-[11px] uppercase">Routes to be removed:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {unusedRoots.map((r) => (
                  <span key={r} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-700">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmCleanUnused(false)}
                disabled={isCleaningUnused}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanUnused}
                disabled={isCleaningUnused}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
              >
                {isCleaningUnused ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove {unusedRoots.length} Routes</span>
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
