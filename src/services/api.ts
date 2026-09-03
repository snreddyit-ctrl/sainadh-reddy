import { Invoice, InvoiceStatus, SheetsConfig } from '../types';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
}

const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export const api = {
  async getInvoices(): Promise<{ invoices: Invoice[]; isConnected: boolean; lastSynced: string | null }> {
    try {
      const res = await fetch(`/api/invoices?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: noCacheHeaders,
      });
      const json: ApiResponse<Invoice[]> = await res.json();
      return {
        invoices: json.data || [],
        isConnected: Boolean(json.meta?.isConnected),
        lastSynced: json.meta?.lastSynced || null,
      };
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      return { invoices: [], isConnected: false, lastSynced: null };
    }
  },

  async addInvoice(invoiceData: {
    billNo: string;
    root: string;
    billDate: string;
    billAmount: number;
    amountPaid: number;
  }): Promise<ApiResponse<Invoice>> {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify(invoiceData),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error occurred' };
    }
  },

  async addPayment(billNo: string, currentPayment: number): Promise<ApiResponse<Invoice>> {
    try {
      const res = await fetch('/api/invoices/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ billNo, currentPayment }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error occurred' };
    }
  },

  async updateInvoice(billNo: string, data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(billNo)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error occurred' };
    }
  },

  async deleteInvoice(billNo: string): Promise<ApiResponse<Invoice>> {
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(billNo)}`, {
        method: 'DELETE',
        headers: noCacheHeaders,
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error occurred' };
    }
  },

  async bulkDeleteInvoices(billNos: string[]): Promise<ApiResponse<{ deletedCount: number; data: Invoice[] }>> {
    try {
      const res = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ billNos }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete invoices' };
    }
  },

  async getRoots(): Promise<string[]> {
    try {
      const res = await fetch(`/api/roots?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: noCacheHeaders,
      });
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      return [];
    }
  },

  async addRoot(rootName: string): Promise<ApiResponse<string[]>> {
    try {
      const res = await fetch('/api/roots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ rootName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to add root' };
    }
  },

  async updateRoot(oldRootName: string, newRootName: string): Promise<ApiResponse<{ roots: string[]; updatedInvoicesCount: number }>> {
    try {
      const res = await fetch(`/api/roots/${encodeURIComponent(oldRootName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ newRootName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update root' };
    }
  },

  async deleteRoot(rootName: string): Promise<ApiResponse<string[]>> {
    try {
      const res = await fetch(`/api/roots/${encodeURIComponent(rootName)}`, {
        method: 'DELETE',
        headers: noCacheHeaders,
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete root' };
    }
  },

  async getSheetsConfig(): Promise<SheetsConfig> {
    try {
      const res = await fetch(`/api/sheets-config?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: noCacheHeaders,
      });
      const json = await res.json();
      return json.data || { appsScriptUrl: '', isConnected: false, lastSynced: null, mode: 'local_fallback' };
    } catch (err) {
      return { appsScriptUrl: '', isConnected: false, lastSynced: null, mode: 'local_fallback' };
    }
  },

  async updateSheetsConfig(appsScriptUrl: string): Promise<ApiResponse<SheetsConfig>> {
    try {
      const res = await fetch('/api/sheets-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ appsScriptUrl }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update sheets configuration' };
    }
  },

  async forceSync(): Promise<{ success: boolean; message: string; lastSynced?: string }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: noCacheHeaders,
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Sync failed' };
    }
  },

  // ----------------------------------------------------
  // AUTH METHODS
  // ----------------------------------------------------

  async checkAuthStatus(token?: string | null): Promise<{ isAuthenticated: boolean; user?: any }> {
    try {
      const headers: Record<string, string> = { ...noCacheHeaders };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/auth/status?_t=${Date.now()}`, {
        cache: 'no-store',
        headers,
      });
      const json = await res.json();
      return {
        isAuthenticated: Boolean(json.isAuthenticated),
        user: json.user || null,
      };
    } catch (err) {
      return { isAuthenticated: false, user: null };
    }
  },

  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ username, password }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Login network error' };
    }
  },

  async logout(token?: string | null): Promise<ApiResponse<void>> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...noCacheHeaders };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Logout failed' };
    }
  },

  async getSecurityQuestion(username: string): Promise<ApiResponse<{ securityQuestion: string }>> {
    try {
      const res = await fetch('/api/auth/reset-password/get-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true, data: { securityQuestion: json.securityQuestion } };
      }
      return { success: false, message: json.message || 'User not found' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  },

  async verifyAndResetPassword(params: {
    username: string;
    method: 'security_question' | 'recovery_pin';
    securityAnswer?: string;
    recoveryPin?: string;
    newPassword: string;
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const res = await fetch('/api/auth/reset-password/verify-and-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify(params),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Password reset failed' };
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Change password failed' };
    }
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    username?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    recoveryPin?: string;
    currentPassword: string;
  }): Promise<ApiResponse<{ user: any }>> {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...noCacheHeaders },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Update profile failed' };
    }
  },
};
