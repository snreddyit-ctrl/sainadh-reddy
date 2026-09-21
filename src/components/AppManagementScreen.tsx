import React from 'react';
import {
  Sliders,
  Database,
  Download,
  MapPin,
  UserCheck,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Clock,
  LogOut,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useAuth, MASTER_ADMIN_EMAIL } from '../context/AuthContext';
import { Invoice } from '../types';

interface AppManagementScreenProps {
  invoices: Invoice[];
  roots: string[];
  pendingApprovalsCount: number;
  isSyncing: boolean;
  onSync: () => void;
  onOpenFirebaseModal: () => void;
  onOpenExportCenter: () => void;
  onOpenManageRoots: () => void;
  onOpenApprovalsModal: () => void;
  onOpenDownloadModal: (root?: string) => void;
  onOpenBulkDeletePaid?: () => void;
}

export const AppManagementScreen: React.FC<AppManagementScreenProps> = ({
  invoices,
  roots,
  pendingApprovalsCount,
  isSyncing,
  onSync,
  onOpenFirebaseModal,
  onOpenExportCenter,
  onOpenManageRoots,
  onOpenApprovalsModal,
  onOpenDownloadModal,
  onOpenBulkDeletePaid,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const isAdmin =
    userProfile?.role === 'admin' ||
    (currentUser?.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter((i) => i.amountPending > 0).length;
  const paidInvoices = invoices.filter((i) => i.status === 'Paid').length;

  return (
    <div className="space-y-5 pb-20 animate-fadeIn max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              App Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cloud Database, Data Exports, Delivery Routes, Staff Approvals & System Controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Sync latest records from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Management Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1: Firebase Cloud Database */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Firestore Cloud Database</h3>
                  <p className="text-[11px] text-slate-500">Real-time sync & persistent storage</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Records are persistently stored in Google Cloud Firestore with real-time multi-device sync and offline cache.
            </p>

            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Bills</p>
                <p className="text-sm font-black text-slate-800">{totalInvoices}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Pending</p>
                <p className="text-sm font-black text-amber-600">{pendingInvoices}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Settled</p>
                <p className="text-sm font-black text-emerald-600">{paidInvoices}</p>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenFirebaseModal}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>View Firebase Status & Diagnostic Info</span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Module 2: Data Export & Reports */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Export & Report Center</h3>
                  <p className="text-[11px] text-slate-500">Excel, CSV & ZIP Archives</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Reports
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export all invoice tables, download route-wise pending bills formatted for collection, or download complete data backups.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onOpenExportCenter}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-900 border border-blue-200 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-blue-700" />
                  <span>Open Export Center (CSV / ZIP)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onOpenDownloadModal('All')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Pending Bills Formatted CSV</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Module 3: Delivery Roots & Routes */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delivery Roots & Territories</h3>
                  <p className="text-[11px] text-slate-500">Route classification & management</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                {roots.length} Routes
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Add new delivery routes, rename territory names, or delete obsolete routes with automatic reassignment options.
            </p>

            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
              {roots.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenManageRoots}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-purple-900 border border-purple-200 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-700" />
                <span>Configure & Manage Routes</span>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Module 4: Staff & Account Approvals */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">User Approvals & Access</h3>
                  <p className="text-[11px] text-slate-500">Role-based security & sign-up reviews</p>
                </div>
              </div>
              {pendingApprovalsCount > 0 ? (
                <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                  {pendingApprovalsCount} Pending
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  All Approved
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              New user registrations require Master Admin review before gaining access to confidential distribution invoices.
            </p>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <p className="font-bold">Master Admin Security</p>
                <p className="text-[11px] text-amber-700 truncate">{MASTER_ADMIN_EMAIL}</p>
              </div>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                Protected
              </span>
            </div>
          </div>

          <div className="pt-1">
            {isAdmin ? (
              <button
                type="button"
                onClick={onOpenApprovalsModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>Review Pending Account Approvals ({pendingApprovalsCount})</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold text-center">
                Admin permissions required to approve users.
              </div>
            )}
          </div>
        </div>

        {/* Module 5: Bulk Database Clean-up */}
        {onOpenBulkDeletePaid && (
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Settled Bills Maintenance</h3>
                    <p className="text-[11px] text-slate-500">Bulk delete paid invoices by date range</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                  {paidInvoices} Settled
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Purge settled bills to keep Firestore clean and performant. Automatically verifies that no outstanding balance exists before deletion.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenBulkDeletePaid}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-800 border border-rose-200 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Bulk Delete Paid Invoices</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Module 6: Session & Security Policy */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security & Session Policy</h3>
                  <p className="text-[11px] text-slate-500">Inactivity protection & account info</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-slate-700 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>5-Minute Inactivity Auto Sign-Out:</strong> Active across all devices to protect confidential ledger entries.
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{userProfile?.displayName || currentUser?.displayName || 'User'}</p>
                  <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {userProfile?.role || 'Staff'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Sign Out of Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
