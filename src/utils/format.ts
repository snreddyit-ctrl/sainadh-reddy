import { InvoiceStatus } from '../types';

/**
 * Format numbers into Indian Rupee notation (e.g. ₹10,000, ₹1,50,000)
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Calculate amount pending and status based on bill amount and amount paid
 */
export function calculateInvoiceCalculations(
  billAmount: number,
  amountPaid: number
): { amountPending: number; status: InvoiceStatus } {
  const safeBillAmount = Math.max(0, Number(billAmount) || 0);
  const safeAmountPaid = Math.max(0, Number(amountPaid) || 0);
  
  const amountPending = Math.max(0, safeBillAmount - safeAmountPaid);

  let status: InvoiceStatus = 'Pending';
  if (safeAmountPaid === 0) {
    status = 'Pending';
  } else if (safeAmountPaid > 0 && safeAmountPaid < safeBillAmount) {
    status = 'Part Paid';
  } else if (safeAmountPaid >= safeBillAmount) {
    status = 'Paid';
  }

  return {
    amountPending,
    status,
  };
}

/**
 * Validate that Bill No contains only numeric characters
 */
export function validateBillNumber(billNo: string): { isValid: boolean; error?: string } {
  const trimmed = billNo.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Bill No is required' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { isValid: false, error: 'Bill No must contain numbers only (no letters, spaces, or special characters)' };
  }
  return { isValid: true };
}

/**
 * Format date string to display format (e.g., 21 Aug 2026)
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch (e) {
    // fallback
  }
  return dateString;
}

/**
 * Get today's date formatted as YYYY-MM-DD for input[type="date"]
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
