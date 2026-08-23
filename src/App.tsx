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
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ManageRootsModal } from './components/ManageRootsModal';
import { DownloadPendingBillsModal } from './components/DownloadPendingBillsModal';
import { ExportCenterModal } from './components/ExportCenterModal';
import { api } from './services/api';
import {
  ActiveScreen,
  DashboardSummary,
  Invoice,
  RootPendingSummary,
  SheetsConfig,
} from './types';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [roots, setRoots] = useState<string[]>(['Pattapuram', 'Hyderabad', 'Vijayawada']);
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>({
    appsScriptUrl: '',
    isConnected: false,
    lastSynced: null,
    mode: 'local_fallback',
  });

  // Loading & Sync States
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals & Sub-states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInitialBillNo, setPaymentInitialBillNo] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isRootsModalOpen, setIsRootsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalRoot, setDownloadModalRoot] = useState<string>('All');
  const [isExportCenterOpen, setIsExportCenterOpen] = useState(false);

  // Fetch fresh data from database
  const fetchData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const [invData, rootsData, configData] = await Promise.all([
        api.getInvoices(),
        api.getRoots(),
        api.getSheetsConfig(),
      ]);

      setInvoices(invData.invoices);
      setRoots(rootsData);
      setSheetsConfig(configData);
    } catch (err) {
      console.error('Error fetching app data:', err);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch with loader
    fetchData(true);

    // Auto-refresh when user opens tab, focuses window or navigates back
    const handleFocus = () => {
      fetchData(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Background interval auto-refresh every 20 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    }, 20000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // Force Google Sheet Sync
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await api.forceSync();
      await fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Compute Dashboard Metrics & Summaries
  const dashboardSummary: DashboardSummary = useMemo(() => {
    const totalBills = invoices.length;
    const totalBillAmount = invoices.reduce((acc, i) => acc + (Number(i.billAmount) || 0), 0);
    const totalAmountPaid = invoices.reduce((acc, i) => acc + (Number(i.amountPaid) || 0), 0);
    const totalPendingAmount = invoices.reduce((acc, i) => acc + (Number(i.amountPending) || 0), 0);

    const pendingBillsCount = invoices.filter((i) => i.status === 'Pending').length;
    const partPaidBillsCount = invoices.filter((i) => i.status === 'Part Paid').length;
    const paidBillsCount = invoices.filter((i) => i.status === 'Paid').length;

    const collectionRate = totalBillAmount > 0 ? Math.round((totalAmountPaid / totalBillAmount) * 100) : 0;

    // Aggregate by Root
    const rootMap = new Map<string, { pending: number; total: number; paid: number; count: number; pendingCount: number }>();
    
    roots.forEach((r) => {
      rootMap.set(r, { pending: 0, total: 0, paid: 0, count: 0, pendingCount: 0 });
    });

    invoices.forEach((inv) => {
      const r = inv.root || 'Unassigned';
      const existing = rootMap.get(r) || { pending: 0, total: 0, paid: 0, count: 0, pendingCount: 0 };
      existing.pending += inv.amountPending || 0;
      existing.total += inv.billAmount || 0;
      existing.paid += inv.amountPaid || 0;
      existing.count += 1;
      if (inv.status === 'Pending' || inv.status === 'Part Paid') {
        existing.pendingCount += 1;
      }
      rootMap.set(r, existing);
    });

    const rootPending: RootPendingSummary[] = Array.from(rootMap.entries())
      .map(([root, stats]) => ({
        root,
        pendingAmount: stats.pending,
        totalAmount: stats.total,
        paidAmount: stats.paid,
        billCount: stats.count,
        pendingCount: stats.pendingCount,
      }))
      .sort((a, b) => b.pendingAmount - a.pendingAmount);

    return {
      totalBills,
      totalBillAmount,
      totalAmountPaid,
      totalPendingAmount,
      pendingBillsCount,
      partPaidBillsCount,
      paidBillsCount,
      collectionRate,
      rootPending,
    };
  }, [invoices, roots]);

  // Handler: Save Invoice
  const handleSaveInvoice = async (invoiceData: {
    billNo: string;
    root: string;
    billDate: string;
    billAmount: number;
    amountPaid: number;
  }) => {
    const res = await api.addInvoice(invoiceData);
    if (res.success && res.data) {
      setInvoices((prev) => [res.data!, ...prev.filter((i) => i.billNo !== res.data!.billNo)]);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Failed to save invoice.' };
  };

  // Handler: Record Payment
  const handleRecordPayment = async (billNo: string, currentPayment: number) => {
    const res = await api.addPayment(billNo, currentPayment);
    if (res.success && res.data) {
      setInvoices((prev) =>
        prev.map((i) => (i.billNo === billNo ? res.data! : i))
      );
      if (selectedInvoice && selectedInvoice.billNo === billNo) {
        setSelectedInvoice(res.data);
      }
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Failed to record payment.' };
  };

  // Handler: Update Invoice
  const handleUpdateInvoice = async (billNo: string, updateData: Partial<Invoice>) => {
    const res = await api.updateInvoice(billNo, updateData);
    if (res.success && res.data) {
      setInvoices((prev) =>
        prev.map((i) => (i.billNo === billNo ? res.data! : i))
      );
      setSelectedInvoice(res.data);
      return true;
    }
    return false;
  };

  // Handler: Delete Invoice
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteInvoice(deleteTarget.billNo);
      if (res.success) {
        setInvoices((prev) => prev.filter((i) => i.billNo !== deleteTarget.billNo));
        setDeleteTarget(null);
        setSelectedInvoice(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler: Bulk Delete Paid Invoices
  const handleBulkDeleteInvoices = async (billNos: string[]) => {
    try {
      const res = await api.bulkDeleteInvoices(billNos);
      if (res.success) {
        const deletedSet = new Set(billNos);
        setInvoices((prev) => prev.filter((i) => !deletedSet.has(i.billNo)));
        if (selectedInvoice && deletedSet.has(selectedInvoice.billNo)) {
          setSelectedInvoice(null);
        }
        return {
          success: true,
          count: res.data?.deletedCount ?? billNos.length,
          message: res.message,
        };
      }
      return {
        success: false,
        count: 0,
        message: res.message || 'Failed to delete selected paid invoices.',
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: err.message || 'Network error occurred during bulk delete.',
      };
    }
  };

  // Handler: Add Root
  const handleAddNewRoot = async (rootName: string) => {
    const res = await api.addRoot(rootName);
    if (res.success && res.data) {
      setRoots(res.data);
      return true;
    }
    return false;
  };

  // Handler: Update / Rename Root
  const handleUpdateRoot = async (oldRootName: string, newRootName: string) => {
    const res = await api.updateRoot(oldRootName, newRootName);
    if (res.success && res.data) {
      setRoots(res.data.roots);
      // update invoice states locally
      setInvoices((prev) =>
        prev.map((i) =>
          i.root.toLowerCase() === oldRootName.toLowerCase() ? { ...i, root: newRootName } : i
        )
      );
      if (selectedInvoice && selectedInvoice.root.toLowerCase() === oldRootName.toLowerCase()) {
        setSelectedInvoice({ ...selectedInvoice, root: newRootName });
      }
      return true;
    }
    return false;
  };

  // Handler: Delete Root
  const handleDeleteRoot = async (rootName: string) => {
    const res = await api.deleteRoot(rootName);
    if (res.success && res.data) {
      setRoots(res.data);
      return true;
    }
    return false;
  };

  // Handler: Update Sheets Config URL
  const handleSaveSheetsConfig = async (url: string) => {
    const res = await api.updateSheetsConfig(url);
    if (res.success && res.data) {
      setSheetsConfig(res.data);
      await fetchData();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Connection test failed.' };
  };

  // Quick Pay from cards
  const handleQuickPayment = (billNo: string) => {
    setPaymentInitialBillNo(billNo);
    setActiveScreen('add_payment');
  };

  const pendingCount = dashboardSummary.pendingBillsCount + dashboardSummary.partPaidBillsCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={(screen) => {
            if (screen === 'add_payment') {
              setPaymentInitialBillNo('');
            }
            setActiveScreen(screen);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          sheetsConfig={sheetsConfig}
          isSyncing={isSyncing}
          onSync={handleForceSync}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          onOpenManageRoots={() => setIsRootsModalOpen(true)}
          onOpenDownloadModal={() => {
            setDownloadModalRoot('All');
            setIsDownloadModalOpen(true);
          }}
          onOpenExportCenter={() => setIsExportCenterOpen(true)}
          pendingCount={pendingCount}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Navbar */}
        <Navbar
          sheetsConfig={sheetsConfig}
          isSyncing={isSyncing}
          onSync={handleForceSync}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          onOpenExportCenter={() => setIsExportCenterOpen(true)}
        />

        {/* Content Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 mb-16 lg:mb-6">
          {isLoading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm font-semibold text-slate-700">Loading VIJAYA AGENCIES...</div>
              <div className="text-xs text-slate-400">Connecting Google Sheets database</div>
            </div>
          ) : (
            <>
              {activeScreen === 'home' && (
                <HomeScreen
                  summary={dashboardSummary}
                  recentInvoices={invoices}
                  onNavigate={(screen) => setActiveScreen(screen)}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                  onOpenExportCenter={() => setIsExportCenterOpen(true)}
                  isConnected={sheetsConfig.isConnected}
                />
              )}

              {activeScreen === 'all_bills' && (
                <AllBillsScreen
                  invoices={invoices}
                  roots={roots}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onQuickPayment={handleQuickPayment}
                  onNavigateToAddInvoice={() => setActiveScreen('add_invoice')}
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
        message="Are you sure you want to delete this invoice?"
        billNo={deleteTarget?.billNo}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      {/* Manage Roots Modal (Add Details & Delete Roots) */}
      <ManageRootsModal
        isOpen={isRootsModalOpen}
        onClose={() => setIsRootsModalOpen(false)}
        roots={roots}
        invoices={invoices}
        onAddNewRoot={handleAddNewRoot}
        onUpdateRoot={handleUpdateRoot}
        onDeleteRoot={handleDeleteRoot}
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

      {/* Google Sheets Connection Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        config={sheetsConfig}
        onSaveConfig={handleSaveSheetsConfig}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
      />
    </div>
  );
}
