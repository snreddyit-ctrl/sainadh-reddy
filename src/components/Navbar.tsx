import React from 'react';
import { RefreshCw, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { SheetsConfig } from '../types';

interface NavbarProps {
  sheetsConfig: SheetsConfig;
  isSyncing: boolean;
  onSync: () => void;
  onOpenSheetsModal: () => void;
  onOpenExportCenter?: () => void;
  onOpenSyncPopup?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sheetsConfig,
  isSyncing,
  onSync,
  onOpenSheetsModal,
  onOpenExportCenter,
  onOpenSyncPopup,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 lg:hidden">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
            VA
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-blue-700">
              VIJAYA AGENCIES
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Distribution Hub
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export / Download Center Button */}
          {onOpenExportCenter && (
            <button
              onClick={onOpenExportCenter}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
              title="Download Files & Reports"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          {/* Sheets connection status badge */}
          <button
            onClick={onOpenSheetsModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              sheetsConfig.isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title="Google Sheets Settings"
          >
            <div
              className={`h-2 w-2 rounded-full ${
                sheetsConfig.isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></div>
            <span>
              {sheetsConfig.isConnected ? 'Connected' : 'Configure'}
            </span>
          </button>

          {/* Sync Button */}
          <button
            onClick={onOpenSyncPopup || onSync}
            disabled={isSyncing}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center"
            title="Open Sync Data Popup"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};

