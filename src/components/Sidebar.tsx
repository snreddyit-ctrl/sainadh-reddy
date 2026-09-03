import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Clock,
  PlusCircle,
  CreditCard,
  Building2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Settings,
  Download,
} from 'lucide-react';
import { ActiveScreen, SheetsConfig } from '../types';

interface SidebarProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  sheetsConfig: SheetsConfig;
  isSyncing: boolean;
  onSync: () => void;
  onOpenSheetsModal: () => void;
  onOpenManageRoots?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenExportCenter?: () => void;
  onOpenSyncPopup?: () => void;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  sheetsConfig,
  isSyncing,
  onSync,
  onOpenSheetsModal,
  onOpenManageRoots,
  onOpenDownloadModal,
  onOpenExportCenter,
  onOpenSyncPopup,
  pendingCount,
}) => {
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
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-bold tracking-tight text-blue-700">VIJAYA AGENCIES</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Distribution Hub
        </p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
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
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-700 bg-blue-50/60 hover:bg-blue-100/80 hover:text-blue-900 border border-blue-100"
          >
            <div className="flex items-center">
              <Download className="w-4 h-4 mr-3 text-blue-700" />
              <span className="font-semibold text-blue-900">Export & Download</span>
            </div>
            <span className="text-[10px] uppercase font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">
              CSV/ZIP
            </span>
          </button>
        )}

        {onOpenDownloadModal && (
          <button
            onClick={onOpenDownloadModal}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <div className="flex items-center">
              <Download className="w-4 h-4 mr-3 text-slate-400" />
              <span>Pending Bills CSV</span>
            </div>
          </button>
        )}

        {onOpenManageRoots && (
          <button
            onClick={onOpenManageRoots}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-3 text-slate-400" />
              <span>Manage Roots</span>
            </div>
          </button>
        )}
      </div>

      {/* Bottom Sync & Sheets Status */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        <button
          onClick={onOpenSheetsModal}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <div
              className={`h-2 w-2 rounded-full ${
                sheetsConfig.isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></div>
            <span
              className={
                sheetsConfig.isConnected ? 'text-green-600' : 'text-amber-600'
              }
            >
              {sheetsConfig.isConnected ? 'CONNECTED TO SHEETS' : 'LOCAL ENGINE'}
            </span>
          </div>
          <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSyncPopup || onSync}
            disabled={isSyncing}
            className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Open Sync Data Popup"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

