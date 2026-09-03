import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  Settings,
  Layers,
  Clock,
} from 'lucide-react';
import { SheetsConfig } from '../types';

interface SyncDataPopupProps {
  isOpen: boolean;
  onClose: () => void;
  sheetsConfig: SheetsConfig;
  invoicesCount: number;
  rootsCount: number;
  onSync: () => Promise<{ success: boolean; message?: string }>;
  isSyncing: boolean;
  onOpenSheetsModal: () => void;
}

export const SyncDataPopup: React.FC<SyncDataPopupProps> = ({
  isOpen,
  onClose,
  sheetsConfig,
  invoicesCount,
  rootsCount,
  onSync,
  isSyncing,
  onOpenSheetsModal,
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('va_auto_sync_on_open');
      return stored !== null ? stored === 'true' : true; // Default to true for seamless sync
    } catch {
      return true;
    }
  });
  const [hasAutoSynced, setHasAutoSynced] = useState<boolean>(false);

  // When modal opens, reset status if idle
  useEffect(() => {
    if (isOpen) {
      setSyncStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  // Handle auto-sync on open if connected and enabled
  useEffect(() => {
    if (isOpen && autoSyncEnabled && sheetsConfig.isConnected && !hasAutoSynced && syncStatus === 'idle') {
      setHasAutoSynced(true);
      handleTriggerSync();
    }
  }, [isOpen, autoSyncEnabled, sheetsConfig.isConnected, hasAutoSynced, syncStatus]);

  if (!isOpen) return null;

  const handleToggleAutoSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setAutoSyncEnabled(newVal);
    try {
      localStorage.setItem('va_auto_sync_on_open', String(newVal));
    } catch (err) {
      console.error('Failed to save auto-sync preference:', err);
    }
  };

  const handleTriggerSync = async () => {
    setSyncStatus('syncing');
    setStatusMessage('Connecting to Google Sheets and downloading latest data...');
    try {
      const res = await onSync();
      if (res && res.success) {
        setSyncStatus('success');
        setStatusMessage(res.message || 'All invoices, payments, and roots are fully synchronized with Google Sheets.');
      } else {
        setSyncStatus('error');
        setStatusMessage(res?.message || 'Sync failed. Check Google Apps Script deployment or network.');
      }
    } catch (err: any) {
      setSyncStatus('error');
      setStatusMessage(err?.message || 'Unexpected sync error. Please try again.');
    }
  };

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Not synced in this session';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-popup-title"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp flex flex-col">
        {/* Header */}
        <div className="p-4 bg-linear-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <RefreshCw className={`w-5 h-5 text-white ${isSyncing || syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 id="sync-popup-title" className="font-bold text-base leading-tight">
                Sync Data
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                VIJAYA AGENCIES Distribution Hub
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-sync-popup-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            title="Close and continue to dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          {/* Connection Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Connection Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  sheetsConfig.isConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sheetsConfig.isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`}
                />
                {sheetsConfig.isConnected ? 'Connected to Sheets' : 'Local Engine Active'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Last Synced:{' '}
                <strong className="text-slate-700 font-semibold">
                  {formatLastSync(sheetsConfig.lastSynced)}
                </strong>
              </span>
            </div>

            {/* Quick Stats Pill */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Invoices in Hub</div>
                  <div className="text-xs font-bold text-slate-900">{invoicesCount} Bills</div>
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/70 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Active Roots</div>
                  <div className="text-xs font-bold text-slate-900">{rootsCount} Routes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Progress / Feedback Banner */}
          {syncStatus === 'syncing' && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5 animate-fadeIn">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-blue-950">Synchronizing in progress...</div>
                <div className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                  {statusMessage || 'Fetching latest invoices, collections, and routes from Google Sheets...'}
                </div>
              </div>
            </div>
          )}

          {syncStatus === 'success' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-emerald-950">Sync Successful!</div>
                <div className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  {statusMessage}
                </div>
              </div>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-red-950">Sync Incomplete</div>
                <div className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                  {statusMessage}
                </div>
              </div>
            </div>
          )}

          {/* If Not Connected Notice */}
          {!sheetsConfig.isConnected && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-2">
              <p className="text-[11px] leading-relaxed">
                Google Sheets is not currently linked. Linking your Google Apps Script Web App enables real-time 2-way cloud synchronization.
              </p>
              <button
                type="button"
                id="sync-popup-config-sheet-btn"
                onClick={() => {
                  onClose();
                  onOpenSheetsModal();
                }}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Google Sheets Connection →</span>
              </button>
            </div>
          )}

          {/* Auto-Sync Option */}
          <div className="flex items-center justify-between pt-1 text-slate-600">
            <label htmlFor="auto-sync-toggle" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="auto-sync-toggle"
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={handleToggleAutoSync}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-[11px] font-medium text-slate-700">
                Always sync data automatically when opening the app
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            id="sync-popup-skip-btn"
            onClick={onClose}
            disabled={isSyncing || syncStatus === 'syncing'}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            {syncStatus === 'success' ? 'Close' : 'Skip for Now'}
          </button>

          <div className="flex items-center gap-2">
            {syncStatus === 'success' ? (
              <button
                type="button"
                id="sync-popup-done-btn"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                id="sync-popup-action-btn"
                onClick={handleTriggerSync}
                disabled={isSyncing || syncStatus === 'syncing'}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing || syncStatus === 'syncing'
                    ? 'Syncing...'
                    : syncStatus === 'error'
                    ? 'Retry Sync'
                    : 'Sync Data Now'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
