import React from 'react';
import { Database, Download, LogOut, UserCheck } from 'lucide-react';
import { useAuth, MASTER_ADMIN_EMAIL } from '../context/AuthContext';

interface NavbarProps {
  isSyncing: boolean;
  onSync: () => void;
  onOpenFirebaseModal: () => void;
  onOpenExportCenter?: () => void;
  onOpenApprovalsModal?: () => void;
  pendingApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSyncing,
  onSync,
  onOpenFirebaseModal,
  onOpenExportCenter,
  onOpenApprovalsModal,
  pendingApprovalsCount = 0,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const isAdmin = userProfile?.role === 'admin' || (currentUser?.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 lg:hidden shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
            VA
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">
              VIJAYA AGENCIES
            </h1>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
              Firebase Distribution
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Admin Approvals Button */}
          {isAdmin && onOpenApprovalsModal && (
            <button
              onClick={onOpenApprovalsModal}
              className="relative flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all"
              title="User Approvals"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Approvals</span>
              {pendingApprovalsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              )}
            </button>
          )}

          {/* Export Center Button */}
          {onOpenExportCenter && (
            <button
              onClick={onOpenExportCenter}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
              title="Download Files & Reports"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          {/* Firebase connection status badge */}
          <button
            onClick={onOpenFirebaseModal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
            title="Firebase Cloud Database Info"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Firestore</span>
          </button>

          {/* Logout button */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
