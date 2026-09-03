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
import { SyncDataPopup } from './components/SyncDataPopup';
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
  const [isSyncPopupOpen, setIsSyncPopupOpen] = useState(true);

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
  const handleForceSync = async (): Promise<{ success: boolean; message?: string }> => {
    setIsSyncing(true);
    try {
      const res = await api.forceSync();
      await fetchData();
      return res;
    } catch (err: any) {
      console.error('Sync failed:', err);
      return { success: false, message: err?.message || 'Sync failed' };
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Sheets Configuration
  const handleSaveSheetsConfig = async (appsScriptUrl: string) => {
    try {
      const res = await api.updateSheetsConfig(appsScriptUrl);
      if (res.success && res.data) {
        setSheetsConfig(res.data);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to save sheets configuration:', err);
      throw err;
    }
  };

  // Add / Create Invoice
  const handleSaveInvoice = async (invoiceData: {
    billNo: string;
    root: string;
    billDate: string;
    billAmount: number;
    amountPaid: number;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.addInvoice(invoiceData);
      if (res.success) {
        await fetchData();
        setActiveScreen('all_bills');
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to save invoice' };
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      return { success: false, message: err.message || 'Error occurred while saving invoice' };
    }
  };

  // Record / Add Payment
  const handleRecordPayment = async (
    billNo: string,
    currentPayment: number
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.addPayment(billNo, currentPayment);
      if (res.success) {
        await fetchData();
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to record payment' };
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      return { success: false, message: err.message || 'Error occurred while recording payment' };
    }
  };

  // Update existing invoice
  const handleUpdateInvoice = async (billNo: string, data: Partial<Invoice>): Promise<boolean> => {
    try {
      const res = await api.updateInvoice(billNo, data);
      if (res.success && res.data) {
        const updated = res.data;
        setInvoices((prev) => prev.map((inv) => (inv.billNo === updated.billNo ? updated : inv)));
        setSelectedInvoice(updated);
        await fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update invoice:', err);
      return false;
    }
  };

  // Delete invoice handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteInvoice(deleteTarget.billNo);
      if (res.success) {
        setInvoices((prev) => prev.filter((inv) => inv.billNo !== deleteTarget.billNo));
        setSelectedInvoice(null);
        setDeleteTarget(null);
        await fetchData();
      } else {
        alert(res.message || 'Failed to delete invoice');
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      alert('Failed to delete invoice. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete paid bills
  const handleBulkDeleteInvoices = async (
    billNumbers: string[]
  ): Promise<{ success: boolean; count: number; message?: string }> => {
    if (!billNumbers.length) return { success: true, count: 0 };
    try {
      const res = await api.bulkDeleteInvoices(billNumbers);
      if (res.success) {
        setInvoices((prev) => prev.filter((inv) => !billNumbers.includes(inv.billNo)));
        if (selectedInvoice && billNumbers.includes(selectedInvoice.billNo)) {
          setSelectedInvoice(null);
        }
        await fetchData();
        return { success: true, count: res.data?.deletedCount || billNumbers.length };
      }
      return { success: false, count: 0, message: res.message || 'Failed to delete paid bills' };
    } catch (err: any) {
      console.error('Failed to bulk delete invoices:', err);
      return { success: false, count: 0, message: err.message || 'Failed to bulk delete invoices' };
    }
  };

  // Root management
  const handleAddNewRoot = async (newRoot: string): Promise<boolean> => {
    try {
      const res = await api.addRoot(newRoot);
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
      const res = await api.updateRoot(oldName, newName);
      if (res.success && res.data) {
        setRoots(res.data.roots);
        await fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to rename root:', err);
      return false;
    }
  };

  const handleDeleteRoot = async (rootName: string): Promise<boolean> => {
    try {
      const res = await api.deleteRoot(rootName);
      if (res.success && res.data) {
        setRoots(res.data);
        await fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete root:', err);
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
          onOpenSyncPopup={() => setIsSyncPopupOpen(true)}
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
          onOpenSyncPopup={() => setIsSyncPopupOpen(true)}
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
                  onOpenSyncPopup={() => setIsSyncPopupOpen(true)}
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

      {/* Sync Data on Open Popup */}
      <SyncDataPopup
        isOpen={isSyncPopupOpen}
        onClose={() => setIsSyncPopupOpen(false)}
        sheetsConfig={sheetsConfig}
        invoicesCount={invoices.length}
        rootsCount={roots.length}
        onSync={handleForceSync}
        isSyncing={isSyncing}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
      />
    </div>
  );
}
