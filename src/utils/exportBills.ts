import { Invoice } from '../types';
import { formatDate } from './format';
import { getPFStatus } from './printPendingBills';

/**
 * Generates and downloads a CSV file of pending bills for a specific root or all roots
 * Format: SL.NO, Bill No, Bill Date, Amount paid, P/F, Bill Amount
 */
export function downloadRootPendingBillsCsv(
  rootName: string,
  invoices: Invoice[]
) {
  const isAll = rootName === 'All' || rootName === 'ALL';
  
  // Filter pending or part-paid bills for this root
  const pendingInvoices = invoices
    .filter((inv) => {
      const matchRoot = isAll ? true : inv.root.toLowerCase() === rootName.toLowerCase();
      const isPending = inv.status === 'Pending' || inv.status === 'Part Paid' || inv.amountPending > 0;
      return matchRoot && isPending;
    })
    .sort((a, b) => {
      if (isAll) {
        const rootComp = a.root.localeCompare(b.root);
        if (rootComp !== 0) return rootComp;
      }
      return a.billNo.localeCompare(b.billNo, undefined, { numeric: true });
    });

  if (pendingInvoices.length === 0) {
    alert(`No pending bills found for ${isAll ? 'any root' : `root "${rootName}"`}.`);
    return;
  }

  // Calculate totals
  const totalBilled = pendingInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  // Exact Requested CSV Headers:
  // SL.NO, Bill No, Bill Date, Amount paid, P/F, Bill Amount
  const headers = isAll
    ? ['SL.NO', 'Root', 'Bill No', 'Bill Date', 'Amount paid', 'P/F', 'Bill Amount', 'Amount Pending']
    : ['SL.NO', 'Bill No', 'Bill Date', 'Amount paid', 'P/F', 'Bill Amount', 'Amount Pending'];

  const rows = pendingInvoices.map((inv, idx) => {
    const slNo = idx + 1;
    const billDateFormatted = formatDate(inv.billDate) || inv.billDate;
    const pf = getPFStatus(inv);

    if (isAll) {
      return [
        slNo,
        `"${inv.root.replace(/"/g, '""')}"`,
        `"${inv.billNo}"`,
        `"${billDateFormatted}"`,
        inv.amountPaid,
        `"${pf}"`,
        inv.billAmount,
        inv.amountPending,
      ].join(',');
    }
    return [
      slNo,
      `"${inv.billNo}"`,
      `"${billDateFormatted}"`,
      inv.amountPaid,
      `"${pf}"`,
      inv.billAmount,
      inv.amountPending,
    ].join(',');
  });

  // Total Summary Row
  const totalRow = isAll
    ? `Total,,,${totalPaid},,${totalBilled},${totalPending}`
    : `Total,,,${totalPaid},,${totalBilled},${totalPending}`;

  const csvContent = [
    headers.join(','),
    ...rows,
    '',
    totalRow,
  ].join('\r\n');

  // Trigger file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedRoot = rootName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  
  link.setAttribute('href', url);
  link.setAttribute('download', `VIJAYA_AGENCIES_Pending_Bills_${sanitizedRoot}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies formatted tab-separated text to clipboard for easy pasting into Excel or Google Sheets
 * Format: SL.NO, Bill No, Bill Date, Amount paid, P/F, Bill Amount
 */
export async function copyRootPendingBillsToClipboard(
  rootName: string,
  invoices: Invoice[]
): Promise<boolean> {
  const isAll = rootName === 'All' || rootName === 'ALL';
  const pendingInvoices = invoices
    .filter((inv) => {
      const matchRoot = isAll ? true : inv.root.toLowerCase() === rootName.toLowerCase();
      const isPending = inv.status === 'Pending' || inv.status === 'Part Paid' || inv.amountPending > 0;
      return matchRoot && isPending;
    })
    .sort((a, b) => {
      if (isAll) {
        const rootComp = a.root.localeCompare(b.root);
        if (rootComp !== 0) return rootComp;
      }
      return a.billNo.localeCompare(b.billNo, undefined, { numeric: true });
    });

  if (pendingInvoices.length === 0) return false;

  const totalBilled = pendingInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  const headers = isAll
    ? 'SL.NO\tRoot\tBill No\tBill Date\tAmount paid\tP/F\tBill Amount\tAmount Pending'
    : 'SL.NO\tBill No\tBill Date\tAmount paid\tP/F\tBill Amount\tAmount Pending';

  const rows = pendingInvoices.map((inv, idx) => {
    const slNo = idx + 1;
    const billDateFormatted = formatDate(inv.billDate) || inv.billDate;
    const pf = getPFStatus(inv);
    if (isAll) {
      return `${slNo}\t${inv.root}\t${inv.billNo}\t${billDateFormatted}\t${inv.amountPaid}\t${pf}\t${inv.billAmount}\t${inv.amountPending}`;
    }
    return `${slNo}\t${inv.billNo}\t${billDateFormatted}\t${inv.amountPaid}\t${pf}\t${inv.billAmount}\t${inv.amountPending}`;
  });

  const totalRow = isAll
    ? `Total\t\t\t\t${totalPaid}\t\t${totalBilled}\t${totalPending}`
    : `Total\t\t\t${totalPaid}\t\t${totalBilled}\t${totalPending}`;

  const textContent = `${headers}\n${rows.join('\n')}\n\n${totalRow}`;

  try {
    await navigator.clipboard.writeText(textContent);
    return true;
  } catch (err) {
    // fallback
    const textArea = document.createElement('textarea');
    textArea.value = textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
}
