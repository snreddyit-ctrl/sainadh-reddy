import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  isSyncing?: boolean;
  onSync?: () => void;
  onOpenFirebaseModal?: () => void;
  onOpenExportCenter?: () => void;
  onOpenApprovalsModal?: () => void;
  pendingApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 lg:hidden shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Brand Header */}
        <div className="flex items-center space-x-2.5 min-w-0 shrink">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
            VA
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 truncate">
              VIJAYA AGENCIES
            </h1>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              Firebase Distribution
            </p>
          </div>
        </div>

        {/* Right Header Action - Only Sign Out button as all management buttons moved to App Management tab */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="mobile-nav-signout-btn"
            onClick={logout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:bg-rose-200 transition-all shrink-0 cursor-pointer shadow-2xs"
            title="Sign Out of Portal"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-bold">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
