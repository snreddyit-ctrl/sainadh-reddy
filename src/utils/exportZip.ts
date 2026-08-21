import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Invoice } from '../types';
import { formatDate } from './format';
import { GOOGLE_APPS_SCRIPT_CODE } from './appsScriptCode';

/**
 * Downloads a complete ZIP bundle containing:
 * 1. invoices_all.csv (All invoices)
 * 2. invoices_pending_rootwise.csv (Pending bills sorted and grouped by root)
 * 3. database_backup.json (Raw JSON data backup)
 * 4. GoogleAppsScript_Code.js (Ready-to-use Google Sheet Apps Script)
 * 5. README_VIJAYA_AGENCIES.txt (Instructions & Summary)
 */
export async function downloadAllProjectDataZip(
  invoices: Invoice[],
  roots: string[]
) {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // 1. All Invoices CSV
  const allInvoicesHeaders = ['Bill No', 'Root', 'Bill Date', 'Bill Amount', 'Amount Paid', 'Amount Pending', 'Status'];
  const allInvoicesRows = invoices.map((inv) => [
    `"${inv.billNo}"`,
    `"${inv.root.replace(/"/g, '""')}"`,
    `"${formatDate(inv.billDate) || inv.billDate}"`,
    inv.billAmount,
    inv.amountPaid,
    inv.amountPending,
    `"${inv.status}"`,
  ].join(','));
  const allInvoicesCsv = [allInvoicesHeaders.join(','), ...allInvoicesRows].join('\r\n');
  zip.file('1_all_invoices.csv', allInvoicesCsv);

  // 2. Pending Invoices Root-wise CSV (Exact requested format)
  const pendingInvoices = invoices
    .filter((inv) => inv.status === 'Pending' || inv.status === 'Part Paid' || inv.amountPending > 0)
    .sort((a, b) => a.root.localeCompare(b.root) || a.billNo.localeCompare(b.billNo, undefined, { numeric: true }));

  const pendingHeaders = ['Root', 'Bill No', 'Bill Date', 'Bill Amount', 'Amount Paid', 'Amount Pending'];
  const pendingRows = pendingInvoices.map((inv) => [
    `"${inv.root.replace(/"/g, '""')}"`,
    `"${inv.billNo}"`,
    `"${formatDate(inv.billDate) || inv.billDate}"`,
    inv.billAmount,
    inv.amountPaid,
    inv.amountPending,
  ].join(','));

  const totalBilled = pendingInvoices.reduce((s, i) => s + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((s, i) => s + (Number(i.amountPending) || 0), 0);
  const totalSummaryRow = `Total,,,${totalBilled},${totalPaid},${totalPending}`;

  const pendingCsv = [pendingHeaders.join(','), ...pendingRows, '', totalSummaryRow].join('\r\n');
  zip.file('2_pending_bills_rootwise.csv', pendingCsv);

  // 3. Individual root-specific CSV files folder
  const rootsFolder = zip.folder('roots_pending_breakdown');
  if (rootsFolder) {
    for (const rootName of roots) {
      const rootPending = invoices
        .filter((inv) => inv.root.toLowerCase() === rootName.toLowerCase() && inv.amountPending > 0)
        .sort((a, b) => a.billNo.localeCompare(b.billNo, undefined, { numeric: true }));

      if (rootPending.length > 0) {
        const rootH = ['Bill No', 'Bill Date', 'Bill Amount', 'Amount Paid', 'Amount Pending'];
        const rootR = rootPending.map((inv) => [
          `"${inv.billNo}"`,
          `"${formatDate(inv.billDate) || inv.billDate}"`,
          inv.billAmount,
          inv.amountPaid,
          inv.amountPending,
        ].join(','));
        const rTotB = rootPending.reduce((s, i) => s + (Number(i.billAmount) || 0), 0);
        const rTotP = rootPending.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
        const rTotPend = rootPending.reduce((s, i) => s + (Number(i.amountPending) || 0), 0);
        const rCsv = [rootH.join(','), ...rootR, '', `Total,,${rTotB},${rTotP},${rTotPend}`].join('\r\n');
        rootsFolder.file(`${rootName.replace(/[^a-zA-Z0-9]/g, '_')}_pending.csv`, rCsv);
      }
    }
  }

  // 4. JSON Raw Database File
  const jsonBackup = JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      businessName: 'VIJAYA AGENCIES',
      totalInvoices: invoices.length,
      roots: roots,
      invoices: invoices,
    },
    null,
    2
  );
  zip.file('3_database_backup.json', jsonBackup);

  // 5. Google Apps Script Code
  zip.file('4_GoogleAppsScript_Code.js', GOOGLE_APPS_SCRIPT_CODE);

  // 6. Readme
  const readme = `VIJAYA AGENCIES - EXPORTED FILES ARCHIVE
Export Generated: ${new Date().toLocaleString()}

CONTENTS OF THIS ZIP:
1. 1_all_invoices.csv - Complete listing of all invoices (Paid, Part Paid, Pending).
2. 2_pending_bills_rootwise.csv - Master pending bills list with columns:
   [Root, Bill No, Bill Date, Bill Amount, Amount Paid, Amount Pending].
3. roots_pending_breakdown/ - Folder containing individual CSV files for each route.
4. 3_database_backup.json - Full JSON data export for system backup or restore.
5. 4_GoogleAppsScript_Code.js - Google Sheet synchronizer script.

For questions or support, open the Vijaya Agencies dashboard.
`;
  zip.file('README.txt', readme);

  // Generate & trigger browser download
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `VIJAYA_AGENCIES_EXPORT_${timestamp}.zip`);
}
