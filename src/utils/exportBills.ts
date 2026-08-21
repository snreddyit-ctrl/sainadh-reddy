import { Invoice } from '../types';
import { formatDate } from './format';

/**
 * Generates and downloads a CSV file of pending bills for a specific root or all roots
 * Columns: Bill No, Bill Date, Bill Amount, Amount Paid, Amount Pending
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
    .sort((a, b) => a.billNo.localeCompare(b.billNo, undefined, { numeric: true }));

  if (pendingInvoices.length === 0) {
    alert(`No pending bills found for ${isAll ? 'any root' : `root "${rootName}"`}.`);
    return;
  }

  // Calculate totals
  const totalBilled = pendingInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  // CSV Headers
  const headers = isAll
    ? ['Root', 'Bill No', 'Bill Date', 'Bill Amount', 'Amount Paid', 'Amount Pending']
    : ['Bill No', 'Bill Date', 'Bill Amount', 'Amount Paid', 'Amount Pending'];

  const rows = pendingInvoices.map((inv) => {
    const billDateFormatted = formatDate(inv.billDate) || inv.billDate;
    if (isAll) {
      return [
        `"${inv.root.replace(/"/g, '""')}"`,
        `"${inv.billNo}"`,
        `"${billDateFormatted}"`,
        inv.billAmount,
        inv.amountPaid,
        inv.amountPending,
      ].join(',');
    }
    return [
      `"${inv.billNo}"`,
      `"${billDateFormatted}"`,
      inv.billAmount,
      inv.amountPaid,
      inv.amountPending,
    ].join(',');
  });

  // Total Summary Row
  const totalRow = isAll
    ? `Total,,,${totalBilled},${totalPaid},${totalPending}`
    : `Total,,${totalBilled},${totalPaid},${totalPending}`;

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
    .sort((a, b) => a.billNo.localeCompare(b.billNo, undefined, { numeric: true }));

  if (pendingInvoices.length === 0) return false;

  const totalBilled = pendingInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  const headers = isAll
    ? 'Root\tBill No\tBill Date\tBill Amount\tAmount Paid\tAmount Pending'
    : 'Bill No\tBill Date\tBill Amount\tAmount Paid\tAmount Pending';

  const rows = pendingInvoices.map((inv) => {
    const billDateFormatted = formatDate(inv.billDate) || inv.billDate;
    if (isAll) {
      return `${inv.root}\t${inv.billNo}\t${billDateFormatted}\t${inv.billAmount}\t${inv.amountPaid}\t${inv.amountPending}`;
    }
    return `${inv.billNo}\t${billDateFormatted}\t${inv.billAmount}\t${inv.amountPaid}\t${inv.amountPending}`;
  });

  const totalRow = isAll
    ? `Total\t\t\t${totalBilled}\t${totalPaid}\t${totalPending}`
    : `Total\t\t${totalBilled}\t${totalPaid}\t${totalPending}`;

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
