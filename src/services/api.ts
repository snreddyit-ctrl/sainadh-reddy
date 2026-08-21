import { Invoice, InvoiceStatus, SheetsConfig } from '../types';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
}

export const api = {
  async getInvoices(): Promise<{ invoices: Invoice[]; isConnected: boolean; lastSynced: string | null }> {
    try {
      const res = await fetch('/api/invoices');
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error occurred' };
    }
  },

  async getRoots(): Promise<string[]> {
    try {
      const res = await fetch('/api/roots');
      const json = await res.json();
      return json.data || ['Pattapuram', 'Hyderabad', 'Vijayawada'];
    } catch (err) {
      return ['Pattapuram', 'Hyderabad', 'Vijayawada'];
    }
  },

  async addRoot(rootName: string): Promise<ApiResponse<string[]>> {
    try {
      const res = await fetch('/api/roots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete root' };
    }
  },

  async getSheetsConfig(): Promise<SheetsConfig> {
    try {
      const res = await fetch('/api/sheets-config');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update sheets configuration' };
    }
  },

  async forceSync(): Promise<{ success: boolean; message: string; lastSynced?: string }> {
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Sync failed' };
    }
  },
};
