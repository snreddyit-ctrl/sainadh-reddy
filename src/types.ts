export type InvoiceStatus = 'Pending' | 'Part Paid' | 'Paid';

export interface Invoice {
  billNo: string;
  root: string;
  billDate: string; // YYYY-MM-DD
  billAmount: number;
  amountPaid: number;
  amountPending: number;
  status: InvoiceStatus;
  updatedAt?: string;
  notes?: string;
}

export interface RootItem {
  id?: string;
  name: string;
}

export interface PaymentTransaction {
  id: string;
  billNo: string;
  amount: number;
  date: string;
  previousPaid: number;
  newPaid: number;
  notes?: string;
}

export interface RootPendingSummary {
  root: string;
  pendingAmount: number;
  totalAmount: number;
  paidAmount: number;
  billCount: number;
  pendingCount: number;
}

export interface DashboardSummary {
  totalBills: number;
  totalBillAmount: number;
  totalAmountPaid: number;
  totalPendingAmount: number;
  pendingBillsCount: number;
  partPaidBillsCount: number;
  paidBillsCount: number;
  collectionRate: number;
  rootPending: RootPendingSummary[];
}

export interface SheetsConfig {
  appsScriptUrl: string;
  isConnected: boolean;
  lastSynced: string | null;
  mode: 'connected' | 'local_fallback';
}

export interface UserProfile {
  username: string;
  name: string;
  email: string;
  securityQuestion?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
}

export type ActiveScreen = 
  | 'home'
  | 'all_bills'
  | 'pending_bills'
  | 'add_invoice'
  | 'add_payment'
  | 'dashboard'
  | 'root_pending'
  | 'sheets_settings'
  | 'app_management';
