import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/appsScriptCode';
import { SheetsConfig } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetsConfig;
  onSaveConfig: (url: string) => Promise<{ success: boolean; message?: string }>;
  onForceSync: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onForceSync,
  isSyncing,
}) => {
  const [urlInput, setUrlInput] = useState(config.appsScriptUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await onSaveConfig(urlInput.trim());
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || 'Google Sheets connected successfully.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Failed to connect. Please check URL and access permissions.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Google Sheets Integration</h3>
              <p className="text-[11px] text-slate-400">Single Source of Truth Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="font-semibold">{statusMessage.text}</div>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-slate-500 font-medium">Database Status:</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    config.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                ></span>
                <span className={config.isConnected ? 'text-emerald-700' : 'text-amber-800'}>
                  {config.isConnected ? 'Connected to Google Sheets' : 'Local Storage Engine Active'}
                </span>
              </div>
              {config.lastSynced && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Last Synced: {new Date(config.lastSynced).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            {config.isConnected && (
              <button
                type="button"
                onClick={onForceSync}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            )}
          </div>

          {/* Connect URL Form */}
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label htmlFor="scriptUrl" className="block font-bold text-slate-500 uppercase mb-1">
                Google Apps Script Web App URL:
              </label>
              <input
                id="scriptUrl"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty to use built-in local database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              {config.appsScriptUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    onSaveConfig('');
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs transition-colors"
                >
                  Disconnect Sheet
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase shadow-sm transition-all flex items-center gap-1.5"
              >
                {isSaving ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </form>

          {/* Quick Setup Instructions */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                Setup Guide:
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code.gs'}</span>
              </button>
            </div>

            <ol className="list-decimal pl-4 space-y-1 text-slate-300 leading-relaxed text-[11px]">
              <li>Open Google Sheet &gt; <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the copied script code into <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-300">Code.gs</code>.</li>
              <li>Select <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-300">setupSheetStructure</code> and click <strong>Run</strong>.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong>.</li>
              <li>Set <em>Execute as:</em> <strong>Me</strong> and <em>Who has access:</em> <strong className="text-emerald-400">Anyone</strong>.</li>
              <li>Copy and paste the Web App URL in the input above.</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="text-blue-400 hover:text-blue-300 text-[11px] underline block pt-1"
            >
              {showCodePreview ? 'Hide Code Preview' : 'Show Code Preview'}
            </button>

            {showCodePreview && (
              <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[10px] font-mono text-slate-300 max-h-40 border border-slate-800">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
