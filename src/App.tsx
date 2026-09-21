import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { AddInvoiceScreen } from './components/AddInvoiceScreen';
import { AddPaymentScreen } from './components/AddPaymentScreen';
import { AllBillsScreen } from './components/AllBillsScreen';
import { PendingBillsScreen } from './components/PendingBillsScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { RootPendingScreen } from './components/RootPendingScreen';
import { InvoiceDetailsModal } from './components/InvoiceDetailsModal';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { ManageRootsModal, DeleteRootOptions } from './components/ManageRootsModal';
import { DownloadPendingBillsModal } from './components/DownloadPendingBillsModal';
import { ExportCenterModal } from './components/ExportCenterModal';
import { FirebaseStatusModal } from './components/FirebaseStatusModal';
import { UserApprovalsModal } from './components/UserApprovalsModal';
import { AuthScreen } from './components/AuthScreen';
import { InactivityHandler } from './components/InactivityHandler';
import { AppManagementScreen } from './components/AppManagementScreen';
import dashboardForestBg from './assets/images/dashboard_forest_bg.jpg';
import { AuthProvider, useAuth, MASTER_ADMIN_EMAIL } from './context/AuthContext';
import { firestoreService, DEFAULT_ROOTS } from './services/firestoreService';
import { api } from './services/api';
import {
  ActiveScreen,
  DashboardSummary,
  Invoice,
  RootPendingSummary,
} from './types';

function MainApp() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [roots, setRoots] = useState<string[]>(DEFAULT_ROOTS);

  // Loading & Sync States
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals & Sub-states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInitialBillNo, setPaymentInitialBillNo] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isRootsModalOpen, setIsRootsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalRoot, setDownloadModalRoot] = useState<string>('All');
  const [isExportCenterOpen, setIsExportCenterOpen] = useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const isAdmin = userProfile?.role === 'admin' || (currentUser?.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  // Fetch / Sync data from Firebase Firestore
  const fetchFirestoreData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      // 1. Fetch current invoices and roots from Firestore
      const [firestoreInvoices, firestoreRoots] = await Promise.all([
        firestoreService.getInvoices(),
        firestoreService.getRoots(),
      ]);

      // If Firestore is empty on initial migration, seed existing invoices and roots
      if (firestoreInvoices.length === 0) {
        try {
          const localFallback = await api.getInvoices();
          const localRoots = await api.getRoots();
          if (localFallback.invoices && localFallback.invoices.length > 0) {
            await firestoreService.syncInitialDataIfEmpty(localFallback.invoices, localRoots);
            const reloadedInvoices = await firestoreService.getInvoices();
            const reloadedRoots = await firestoreService.getRoots();
            setInvoices(reloadedInvoices);
            setRoots(reloadedRoots.length > 0 ? reloadedRoots : DEFAULT_ROOTS);
            return;
          }
        } catch (seedErr) {
          console.warn('Initial seeding fallback warning:', seedErr);
        }
      }

      setInvoices(firestoreInvoices);
      // Ensure all roots from invoices are registered into Firestore roots collection
      const syncedRoots = await firestoreService.syncInvoiceRootsToCollection(firestoreInvoices);
      setRoots(syncedRoots.length > 0 ? syncedRoots : firestoreRoots);
    } catch (err) {
      console.error('Error fetching Firestore data:', err);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  };

  // Setup Real-time Firestore Subscription & Initial Fetch
  useEffect(() => {
    if (!currentUser) return;

    fetchFirestoreData(true);

    // Subscribe to live invoice updates in Firestore
    const unsubscribe = firestoreService.subscribeInvoices((liveInvoices) => {
      if (liveInvoices.length > 0 || invoices.length > 0) {
        setInvoices(liveInvoices);
      }
    });

    // Subscribe to live roots updates in Firestore
    const unsubscribeRoots = firestoreService.subscribeRoots((liveRoots) => {
      setRoots(liveRoots);
    });

    // Subscribe to pending approvals count for admin
    let unsubscribeUsers = () => {};
    if (isAdmin) {
      unsubscribeUsers = firestoreService.subscribeUsers((usersList) => {
        const pending = usersList.filter((u) => {
          const isMaster = (u.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
          return !isMaster && (u.approvalStatus === 'pending' || u.isApproved === false);
        });
        setPendingApprovalsCount(pending.length);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeRoots();
      unsubscribeUsers();
    };
  }, [currentUser, isAdmin]);

  // Refresh Firestore
  const handleForceSync = async () => {
    setIsSyncing(true);
    await fetchFirestoreData(false);
    setIsSyncing(false);
  };

  // Add / Create Invoice in Firestore
  const handleSaveInvoice = async (invoiceData: {
    billNo: string;
    root: string;
    billDate: string;
    billAmount: number;
    amountPaid: number;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await firestoreService.addInvoice({
        ...invoiceData,
        userId: currentUser?.uid,
      });

      if (res.success) {
        await fetchFirestoreData(false);
        setActiveScreen('all_bills');
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to save invoice to Firebase' };
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      return { success: false, message: err.message || 'Error occurred while saving invoice' };
    }
  };

  // Record Payment in Firestore
  const handleRecordPayment = async (
    billNo: string,
    currentPayment: number
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await firestoreService.addPayment(billNo, currentPayment, currentUser?.uid);
      if (res.success) {
        await fetchFirestoreData(false);
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to record payment' };
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      return { success: false, message: err.message || 'Error occurred while recording payment' };
    }
  };

  // Update existing invoice in Firestore
  const handleUpdateInvoice = async (billNo: string, data: Partial<Invoice>): Promise<boolean> => {
    try {
      const res = await firestoreService.updateInvoice(billNo, data);
      if (res.success && res.data) {
        const updated = res.data;
        setInvoices((prev) => prev.map((inv) => (inv.billNo === updated.billNo ? updated : inv)));
        setSelectedInvoice(updated);
        await fetchFirestoreData(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update invoice:', err);
      return false;
    }
  };

  // Delete invoice in Firestore
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await firestoreService.deleteInvoice(deleteTarget.billNo);
      if (res.success) {
        setInvoices((prev) => prev.filter((inv) => inv.billNo !== deleteTarget.billNo));
        setSelectedInvoice(null);
        setDeleteTarget(null);
        await fetchFirestoreData(false);
      } else {
        alert(res.message || 'Failed to delete invoice from Firebase');
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      alert('Failed to delete invoice. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete paid bills in Firestore
  const handleBulkDeleteInvoices = async (
    billNumbers: string[]
  ): Promise<{ success: boolean; count: number; message?: string }> => {
    if (!billNumbers.length) return { success: true, count: 0 };
    try {
      const res = await firestoreService.bulkDeleteInvoices(billNumbers);
      if (res.success) {
        setInvoices((prev) => prev.filter((inv) => !billNumbers.includes(inv.billNo)));
        if (selectedInvoice && billNumbers.includes(selectedInvoice.billNo)) {
          setSelectedInvoice(null);
        }
        await fetchFirestoreData(false);
        return { success: true, count: res.count };
      }
      return { success: false, count: 0, message: res.message || 'Failed to delete paid bills' };
    } catch (err: any) {
      console.error('Failed to bulk delete invoices:', err);
      return { success: false, count: 0, message: err.message || 'Failed to bulk delete invoices' };
    }
  };

  // Root management in Firestore
  const handleAddNewRoot = async (newRoot: string): Promise<boolean> => {
    try {
      const res = await firestoreService.addRoot(newRoot);
      if (res.success && res.data) {
        setRoots(res.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add new root:', err);
      return false;
    }
  };

  const handleUpdateRoot = async (oldName: string, newName: string): Promise<boolean> => {
    try {
      const res = await firestoreService.updateRoot(oldName, newName);
      if (res.success && res.data) {
        setRoots(res.data.roots);
        await fetchFirestoreData(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to rename root:', err);
      return false;
    }
  };

  const handleDeleteRoot = async (
    rootName: string,
    options?: DeleteRootOptions
  ): Promise<boolean> => {
    try {
      const res = await firestoreService.deleteRoot(rootName, options);
      if (res.success && res.data) {
        setRoots(res.data);
        api.deleteRoot(rootName, options).catch((e) => console.warn('Server deleteRoot sync:', e));
        await fetchFirestoreData(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete root:', err);
      return false;
    }
  };

  const handleDeleteUnusedRoots = async (): Promise<boolean> => {
    try {
      const res = await firestoreService.deleteUnusedRoots(invoices);
      if (res.success && res.data) {
        setRoots(res.data);
        await fetchFirestoreData(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete unused roots:', err);
      return false;
    }
  };

  // Calculations for Dashboard
  const dashboardSummary: DashboardSummary = useMemo(() => {
    let totalBills = invoices.length;
    let totalBillAmount = 0;
    let totalAmountPaid = 0;
    let totalPendingAmount = 0;
    let paidBillsCount = 0;
    let partPaidBillsCount = 0;
    let pendingBillsCount = 0;

    const rootMap: {
      [root: string]: {
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        billCount: number;
        pendingCount: number;
      };
    } = {};

    roots.forEach((r) => {
      rootMap[r] = {
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        billCount: 0,
        pendingCount: 0,
      };
    });

    invoices.forEach((inv) => {
      totalBillAmount += inv.billAmount || 0;
      totalAmountPaid += inv.amountPaid || 0;
      totalPendingAmount += inv.amountPending || 0;

      if (inv.status === 'Paid') {
        paidBillsCount++;
      } else if (inv.status === 'Part Paid') {
        partPaidBillsCount++;
      } else {
        pendingBillsCount++;
      }

      const r = inv.root || 'Unassigned';
      if (!rootMap[r]) {
        rootMap[r] = {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          billCount: 0,
          pendingCount: 0,
        };
      }
      rootMap[r].totalAmount += inv.billAmount || 0;
      rootMap[r].paidAmount += inv.amountPaid || 0;
      rootMap[r].pendingAmount += inv.amountPending || 0;
      rootMap[r].billCount += 1;
      if (inv.status !== 'Paid' && (inv.amountPending || 0) > 0) {
        rootMap[r].pendingCount += 1;
      }
    });

    const collectionRate = totalBillAmount > 0 ? (totalAmountPaid / totalBillAmount) * 100 : 0;

    const rootPending: RootPendingSummary[] = Object.keys(rootMap).map((root) => ({
      root,
      totalAmount: rootMap[root].totalAmount,
      paidAmount: rootMap[root].paidAmount,
      pendingAmount: rootMap[root].pendingAmount,
      billCount: rootMap[root].billCount,
      pendingCount: rootMap[root].pendingCount,
    }));

    return {
      totalBills,
      totalBillAmount,
      totalAmountPaid,
      totalPendingAmount,
      paidBillsCount,
      partPaidBillsCount,
      pendingBillsCount,
      collectionRate,
      rootPending,
    };
  }, [invoices, roots]);

  // Quick Pay from cards
  const handleQuickPayment = (billNo: string) => {
    setPaymentInitialBillNo(billNo);
    setActiveScreen('add_payment');
  };

  const pendingCount = dashboardSummary.pendingBillsCount + dashboardSummary.partPaidBillsCount;

  // 1. Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Initializing Firebase Authentication...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state -> Show Firebase Login & Registration Screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="relative min-h-screen bg-stone-100/70 text-slate-900 font-sans flex antialiased overflow-x-hidden">
      {/* 5-Minute Inactivity Auto Sign-Out Manager */}
      <InactivityHandler />

      {/* Background Forest & Deers Wallpaper for the Web Dashboard */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={dashboardForestBg}
          alt="Vintage Forest Wallpaper"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-100"
        />
        {/* Soft, warm subtle overlay preserving the aesthetic forest trees and deer while ensuring great readability */}
        <div className="absolute inset-0 bg-stone-100/70 backdrop-blur-[0.5px]" />
      </div>

      {/* Desktop Navigation Sidebar */}
      <div className="relative z-10 hidden lg:block">
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={(screen) => {
            if (screen === 'add_payment') {
              setPaymentInitialBillNo('');
            }
            setActiveScreen(screen);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isSyncing={isSyncing}
          onSync={handleForceSync}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          onOpenManageRoots={() => setIsRootsModalOpen(true)}
          onOpenDownloadModal={() => {
            setDownloadModalRoot('All');
            setIsDownloadModalOpen(true);
          }}
          onOpenExportCenter={() => setIsExportCenterOpen(true)}
          onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingCount={pendingCount}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <Navbar
          isSyncing={isSyncing}
          onSync={handleForceSync}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          onOpenExportCenter={() => setIsExportCenterOpen(true)}
          onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Dynamic Screen View */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {isLoading && invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-500">Connecting to Firebase Cloud Firestore...</p>
            </div>
          ) : (
            <>
              {activeScreen === 'home' && (
                <HomeScreen
                  summary={dashboardSummary}
                  recentInvoices={invoices}
                  onNavigate={(screen) => setActiveScreen(screen)}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onQuickPayment={handleQuickPayment}
                  onOpenDownloadModal={(r) => {
                    setDownloadModalRoot(r || 'All');
                    setIsDownloadModalOpen(true);
                  }}
                  onOpenExportCenter={() => setIsExportCenterOpen(true)}
                  onOpenManageRoots={() => setIsRootsModalOpen(true)}
                />
              )}

              {activeScreen === 'all_bills' && (
                <AllBillsScreen
                  invoices={invoices}
                  roots={roots}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onQuickPayment={handleQuickPayment}
                  onNavigateToAddInvoice={() => {
                    setActiveScreen('add_invoice');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBulkDeletePaid={handleBulkDeleteInvoices}
                  onOpenDownloadModal={(r) => {
                    setDownloadModalRoot(r || 'All');
                    setIsDownloadModalOpen(true);
                  }}
                />
              )}

              {activeScreen === 'pending_bills' && (
                <PendingBillsScreen
                  invoices={invoices}
                  roots={roots}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onQuickPayment={handleQuickPayment}
                  onOpenDownloadModal={(r) => {
                    setDownloadModalRoot(r || 'All');
                    setIsDownloadModalOpen(true);
                  }}
                />
              )}

              {activeScreen === 'add_invoice' && (
                <AddInvoiceScreen
                  roots={roots}
                  existingInvoices={invoices}
                  onSaveInvoice={handleSaveInvoice}
                  onAddNewRoot={handleAddNewRoot}
                  onNavigateToBills={() => setActiveScreen('all_bills')}
                  onOpenManageRoots={() => setIsRootsModalOpen(true)}
                />
              )}

              {activeScreen === 'add_payment' && (
                <AddPaymentScreen
                  invoices={invoices}
                  initialBillNo={paymentInitialBillNo}
                  onRecordPayment={handleRecordPayment}
                  onNavigateToBills={() => setActiveScreen('all_bills')}
                />
              )}

              {activeScreen === 'dashboard' && (
                <DashboardScreen summary={dashboardSummary} />
              )}

              {activeScreen === 'root_pending' && (
                <RootPendingScreen
                  rootPendingList={dashboardSummary.rootPending}
                  invoices={invoices}
                  onBack={() => setActiveScreen('home')}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onQuickPayment={handleQuickPayment}
                  onOpenManageRoots={() => setIsRootsModalOpen(true)}
                  onOpenDownloadModal={(r) => {
                    setDownloadModalRoot(r || 'All');
                    setIsDownloadModalOpen(true);
                  }}
                />
              )}

              {activeScreen === 'app_management' && (
                <AppManagementScreen
                  invoices={invoices}
                  roots={roots}
                  pendingApprovalsCount={pendingApprovalsCount}
                  isSyncing={isSyncing}
                  onSync={handleForceSync}
                  onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
                  onOpenExportCenter={() => setIsExportCenterOpen(true)}
                  onOpenManageRoots={() => setIsRootsModalOpen(true)}
                  onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
                  onOpenDownloadModal={(r) => {
                    setDownloadModalRoot(r || 'All');
                    setIsDownloadModalOpen(true);
                  }}
                  onOpenBulkDeletePaid={() => {
                    setActiveScreen('all_bills');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          if (screen === 'add_payment') {
            setPaymentInitialBillNo('');
          }
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingCount={pendingCount}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        invoice={selectedInvoice}
        roots={roots}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        onOpenPaymentForInvoice={(billNo) => {
          setSelectedInvoice(null);
          handleQuickPayment(billNo);
        }}
        onUpdateInvoice={handleUpdateInvoice}
        onDeleteRequest={(inv) => setDeleteTarget(inv)}
      />

      {/* Delete Confirmation Popup */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Invoice Confirmation"
        message="Are you sure you want to delete this invoice from Firebase?"
        billNo={deleteTarget?.billNo}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      {/* Manage Roots Modal */}
      <ManageRootsModal
        isOpen={isRootsModalOpen}
        onClose={() => setIsRootsModalOpen(false)}
        roots={roots}
        invoices={invoices}
        onAddNewRoot={handleAddNewRoot}
        onUpdateRoot={handleUpdateRoot}
        onDeleteRoot={handleDeleteRoot}
        onDeleteUnusedRoots={handleDeleteUnusedRoots}
      />

      {/* Download Root-Wise Pending Bills Modal */}
      <DownloadPendingBillsModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        roots={roots}
        invoices={invoices}
        defaultRoot={downloadModalRoot}
      />

      {/* Export & Download Center Modal */}
      <ExportCenterModal
        isOpen={isExportCenterOpen}
        onClose={() => setIsExportCenterOpen(false)}
        invoices={invoices}
        roots={roots}
      />

      {/* Firebase Cloud Database Status Modal */}
      <FirebaseStatusModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        totalInvoices={invoices.length}
        totalRoots={roots.length}
        onRefresh={handleForceSync}
      />

      {/* Admin User Approvals Modal */}
      <UserApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        pendingCount={pendingApprovalsCount}
        onRefreshPendingCount={async () => {
          const list = await firestoreService.getPendingApprovals();
          setPendingApprovalsCount(list.length);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
