import React, { useState } from 'react';
import {
  X,
  Database,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Server,
  Key,
  Users,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseConfig, firestoreDatabaseId } from '../lib/firebase';

interface FirebaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalInvoices: number;
  totalRoots: number;
  onRefresh: () => void;
}

export const FirebaseStatusModal: React.FC<FirebaseStatusModalProps> = ({
  isOpen,
  onClose,
  totalInvoices,
  totalRoots,
  onRefresh,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Firebase Cloud Database</h3>
              <p className="text-xs text-slate-400">Google Cloud Firestore & Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Connection Status Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-emerald-900 flex items-center gap-2">
                <span>Cloud Firestore: Connected & Synchronized</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-emerald-800">
                Disconnected from legacy Google Sheets / Excel. All invoice logs, collections, and routes are directly persisted in Firebase.
              </p>
            </div>
          </div>

          {/* Database Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Project ID</span>
              </div>
              <p className="font-mono text-xs font-bold text-slate-800 break-all">{firebaseConfig.projectId}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Firestore DB</span>
              </div>
              <p className="font-mono text-[11px] font-bold text-slate-800 truncate" title={firestoreDatabaseId}>
                {firestoreDatabaseId}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Synced Invoices</span>
              </div>
              <p className="text-base font-bold text-slate-900">{totalInvoices} records</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Distribution Routes</span>
              </div>
              <p className="text-base font-bold text-slate-900">{totalRoots} active routes</p>
            </div>
          </div>

          {/* Active Auth Session */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Authenticated User</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold capitalize">
                {userProfile?.role || 'Authorized'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-900">{userProfile?.displayName || currentUser?.displayName || 'Distribution Manager'}</p>
              <p className="font-mono text-slate-500 text-[11px]">{currentUser?.email || 'No email'}</p>
              <p className="text-[10px] text-slate-400 font-mono">UID: {currentUser?.uid}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Firestore Now'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-200 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
