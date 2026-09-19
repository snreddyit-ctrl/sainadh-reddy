import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  AlertCircle,
  X,
  Trash2,
  Send,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useAuth, MASTER_ADMIN_EMAIL } from '../context/AuthContext';

interface UserApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
  onRefreshPendingCount?: () => void;
}

export const UserApprovalsModal: React.FC<UserApprovalsModalProps> = ({
  isOpen,
  onClose,
  pendingCount,
  onRefreshPendingCount,
}) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const all = await firestoreService.getAllUsers();
      setUsers(all);
    } catch (err) {
      console.error('Error loading users for approval modal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingUsers = users.filter((u) => {
    const isMaster = (u.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    if (isMaster) return false;
    return u.approvalStatus === 'pending' || u.isApproved === false;
  });

  const approvedUsers = users.filter((u) => {
    const isMaster = (u.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    return isMaster || (u.approvalStatus === 'approved' && u.isApproved !== false);
  });

  const displayedList = (activeTab === 'pending' ? pendingUsers : approvedUsers).filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  const handleApprove = async (uid: string, userEmail: string, userName: string, role: 'staff' | 'manager' | 'admin') => {
    setActionInProgressId(uid);
    setNotificationMsg(null);
    try {
      const res = await firestoreService.approveUser(uid, role, currentUser?.email || MASTER_ADMIN_EMAIL);
      if (res.success) {
        setNotificationMsg({
          type: 'success',
          text: `Account for ${userName} (${userEmail}) approved as ${role.toUpperCase()}!`,
        });
        await loadUsers();
        if (onRefreshPendingCount) onRefreshPendingCount();
      } else {
        setNotificationMsg({ type: 'error', text: res.message || 'Approval failed.' });
      }
    } catch (e: any) {
      setNotificationMsg({ type: 'error', text: e.message || 'Failed to approve.' });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (uid: string, userEmail: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to decline registration for ${userName} (${userEmail})?`)) {
      return;
    }
    setActionInProgressId(uid);
    setNotificationMsg(null);
    try {
      const res = await firestoreService.rejectUser(uid, 'Declined by administrator');
      if (res.success) {
        setNotificationMsg({
          type: 'success',
          text: `Registration for ${userName} (${userEmail}) has been declined.`,
        });
        await loadUsers();
        if (onRefreshPendingCount) onRefreshPendingCount();
      } else {
        setNotificationMsg({ type: 'error', text: res.message || 'Rejection failed.' });
      }
    } catch (e: any) {
      setNotificationMsg({ type: 'error', text: e.message || 'Failed to decline.' });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeleteUser = async (uid: string, userEmail: string) => {
    if (userEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      alert('Master administrator account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Permanently remove account record for ${userEmail}?`)) {
      return;
    }
    setActionInProgressId(uid);
    try {
      await firestoreService.deleteUserAccount(uid);
      await loadUsers();
      if (onRefreshPendingCount) onRefreshPendingCount();
      setNotificationMsg({ type: 'success', text: `Account for ${userEmail} was deleted.` });
    } catch (e: any) {
      setNotificationMsg({ type: 'error', text: 'Failed to delete user.' });
    } finally {
      setActionInProgressId(null);
    }
  };

  const openEmailToUser = (userEmail: string, userName: string) => {
    const subject = encodeURIComponent('Your Vijaya Agencies Distribution Account is Approved');
    const body = encodeURIComponent(
      `Hello ${userName},\n\nYour account on Vijaya Agencies Distribution Portal has been approved by administrator.\n\nYou can now log in at any time with your registered credentials.\n\nBest regards,\nVijaya Agencies Administration`
    );
    window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Account Approvals & User Access</span>
                {pendingUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                    {pendingUsers.length} Pending
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Manage user registrations, permissions, and email approvals for Vijaya Agencies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {notificationMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notificationMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">{notificationMsg.text}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-xs opacity-70 hover:opacity-100 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs & Search */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Approvals</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'approved'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Approved Users</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                {approvedUsers.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading user accounts...</p>
            </div>
          ) : displayedList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {activeTab === 'pending' ? 'No pending registration requests' : 'No approved users matching search'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {activeTab === 'pending'
                  ? 'When a new employee or staff registers an account, their approval request will appear here.'
                  : 'Try searching with a different name or email.'}
              </p>
            </div>
          ) : (
            displayedList.map((user) => {
              const isMaster = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
              const isPending = user.approvalStatus === 'pending' || !user.isApproved;
              const isBusy = actionInProgressId === user.uid || actionInProgressId === user.id;

              return (
                <div
                  key={user.uid || user.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPending
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isMaster
                            ? 'bg-purple-600 text-white shadow-xs'
                            : isPending
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800">
                            {user.displayName || 'Unnamed User'}
                          </h4>
                          {isMaster && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              Master Admin
                            </span>
                          )}
                          {!isMaster && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'manager'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {user.role ? user.role.toUpperCase() : 'STAFF'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Registered'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleApprove(
                                user.uid || user.id,
                                user.email,
                                user.displayName || user.email,
                                'staff'
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                            title="Approve as distribution Staff"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve Staff</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleApprove(
                                user.uid || user.id,
                                user.email,
                                user.displayName || user.email,
                                'manager'
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                            title="Approve as Manager"
                          >
                            <span>Approve Manager</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleReject(
                                user.uid || user.id,
                                user.email,
                                user.displayName || user.email
                              )
                            }
                            className="px-2 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openEmailToUser(user.email, user.displayName || user.email)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1"
                            title="Send confirmation email"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                            <span>Notify Email</span>
                          </button>

                          {!isMaster && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteUser(user.uid || user.id, user.email)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Approval email notifications go to: <strong className="text-slate-700">{MASTER_ADMIN_EMAIL}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
