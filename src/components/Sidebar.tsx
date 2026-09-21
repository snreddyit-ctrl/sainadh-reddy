import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Clock,
  PlusCircle,
  CreditCard,
  Building2,
  Database,
  CheckCircle2,
  Settings,
  Download,
  LogOut,
  UserCheck,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { ActiveScreen } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  isSyncing: boolean;
  onSync: () => void;
  onOpenFirebaseModal: () => void;
  onOpenManageRoots?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenExportCenter?: () => void;
  onOpenApprovalsModal?: () => void;
  pendingApprovalsCount?: number;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  isSyncing,
  onSync,
  onOpenFirebaseModal,
  onOpenManageRoots,
  onOpenDownloadModal,
  onOpenExportCenter,
  onOpenApprovalsModal,
  pendingApprovalsCount = 0,
  pendingCount,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const isAdmin = userProfile?.role === 'admin' || (currentUser?.email || '').toLowerCase() === 'snreddy.it@gmail.com';

  const menuItems = [
    { id: 'home' as ActiveScreen, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all_bills' as ActiveScreen, label: 'All Bills', icon: Receipt },
    {
      id: 'pending_bills' as ActiveScreen,
      label: 'Pending Bills',
      icon: Clock,
      badge: pendingCount,
    },
    { id: 'add_invoice' as ActiveScreen, label: 'Add Invoice', icon: PlusCircle },
    { id: 'add_payment' as ActiveScreen, label: 'Add Payment', icon: CreditCard },
    { id: 'root_pending' as ActiveScreen, label: 'Root-wise Pending', icon: Building2 },
    { id: 'dashboard' as ActiveScreen, label: 'Analytics & Charts', icon: LayoutDashboard },
    {
      id: 'app_management' as ActiveScreen,
      label: 'App Management',
      icon: Sliders,
      badge: pendingApprovalsCount,
    },
  ];

  return (
    <aside className="w-64 bg-white/85 backdrop-blur-md border-r border-stone-200/80 flex flex-col shrink-0 h-screen sticky top-0 shadow-xs">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-blue-700">VIJAYA AGENCIES</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            Distribution Hub
          </p>
        </div>
        <div
          onClick={onOpenFirebaseModal}
          className="cursor-pointer p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          title="Firebase Cloud Database Connected"
        >
          <Database className="w-4 h-4" />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center">
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {onOpenExportCenter && (
          <button
            onClick={onOpenExportCenter}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors text-slate-700 bg-blue-50/50 hover:bg-blue-100/70 hover:text-blue-900 border border-blue-100 mt-2"
          >
            <div className="flex items-center">
              <Download className="w-4 h-4 mr-3 text-blue-700" />
              <span className="font-semibold text-blue-900 text-xs">Export & Backup</span>
            </div>
            <span className="text-[9px] uppercase font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
              CSV/ZIP
            </span>
          </button>
        )}

        {onOpenDownloadModal && (
          <button
            onClick={onOpenDownloadModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <div className="flex items-center">
              <Download className="w-3.5 h-3.5 mr-3 text-slate-400" />
              <span>Pending Bills CSV</span>
            </div>
          </button>
        )}

        {onOpenManageRoots && (
          <button
            onClick={onOpenManageRoots}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <div className="flex items-center">
              <Settings className="w-3.5 h-3.5 mr-3 text-slate-400" />
              <span>Manage Roots</span>
            </div>
          </button>
        )}

        {/* Admin Account Approvals */}
        {isAdmin && onOpenApprovalsModal && (
          <button
            onClick={onOpenApprovalsModal}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 mt-2"
          >
            <div className="flex items-center">
              <UserCheck className="w-4 h-4 mr-2.5 text-amber-600" />
              <span>Account Approvals</span>
            </div>
            {pendingApprovalsCount > 0 ? (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pendingApprovalsCount} new
              </span>
            ) : (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </button>
        )}
      </div>

      {/* Bottom User Profile & Firebase Status */}
      <div className="p-3.5 border-t border-slate-100 space-y-2.5 bg-slate-50/50">
        {/* Firebase Cloud Status */}
        <button
          type="button"
          onClick={onOpenFirebaseModal}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition-all text-left shadow-2xs group"
        >
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
              FIREBASE FIRESTORE
            </span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            Live
          </span>
        </button>

        {/* User Card with Logout */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {(userProfile?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {userProfile?.displayName || currentUser?.displayName || 'Distribution User'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser?.email || 'Authenticated'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            title="Sign Out from Firebase"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
