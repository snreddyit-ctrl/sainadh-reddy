import { Invoice } from '../types';
import { formatCurrency, formatDate } from './format';

/**
 * Helper to determine P/F status
 * P = Part Paid (some amount collected)
 * F = Full Pending (0 amount collected yet)
 */
export function getPFStatus(inv: Invoice): 'P' | 'F' {
  if (inv.amountPaid > 0 && inv.amountPending > 0) {
    return 'P'; // Part Paid
  }
  if (inv.amountPaid >= inv.billAmount && inv.billAmount > 0) {
    return 'P'; // Paid
  }
  return 'F'; // Full Pending
}

/**
 * Triggers a clean browser print dialog with formatted root-wise pending bills table
 * Columns: SL.NO, Bill No, Bill Date, Amount Paid, P/F, Bill Amount
 */
export function printRootPendingBills(rootName: string, invoices: Invoice[]) {
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

  if (pendingInvoices.length === 0) {
    alert(`No pending bills found for ${isAll ? 'any route' : `route "${rootName}"`}.`);
    return;
  }

  const totalBilled = pendingInvoices.reduce((sum, i) => sum + (Number(i.billAmount) || 0), 0);
  const totalPaid = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (Number(i.amountPending) || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print pending bills report.');
    return;
  }

  const now = new Date();
  const printDateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const printTimeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tableRowsHtml = pendingInvoices
    .map((inv, index) => {
      const slNo = index + 1;
      const billDate = formatDate(inv.billDate) || inv.billDate;

      return `
        <tr>
          <td style="text-align: center; width: 42px;">${slNo}</td>
          ${isAll ? `<td style="font-weight: 600;">${escapeHtml(inv.root)}</td>` : ''}
          <td style="font-weight: 700; text-align: center;">${escapeHtml(inv.billNo)}</td>
          <td style="text-align: center;">${escapeHtml(billDate)}</td>
          <td style="text-align: right; color: #047857;">${formatCurrency(inv.amountPaid)}</td>
          <td style="text-align: right; font-weight: 700;">${formatCurrency(inv.billAmount)}</td>
          <td style="text-align: right; color: #b91c1c; font-weight: 700;">${formatCurrency(inv.amountPending)}</td>
          <td style="width: 140px; min-width: 120px; text-align: right; color: #cbd5e1;">&nbsp;</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pending Bills - ${escapeHtml(isAll ? 'All Routes' : rootName)} - Vijaya Agencies</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #fff;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-container {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .company-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .report-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #1e40af;
      margin: 0;
    }
    .meta-info {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 6px;
      background: #f8fafc;
    }
    .summary-card-title {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
    }
    .summary-card-val {
      font-size: 14px;
      font-weight: 800;
      margin-top: 2px;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.5px;
      padding: 7px 6px;
      border: 1px solid #94a3b8;
    }
    td {
      padding: 6px 6px;
      height: 30px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .tfoot-row td {
      background-color: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      font-size: 11.5px;
    }
    .legend-box {
      font-size: 10px;
      color: #475569;
      margin-top: 8px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
    }
    .no-print-bar {
      background: #1e293b;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong style="font-size: 14px;">Print Ready Preview</strong> - ${escapeHtml(isAll ? 'All Routes' : `Route: ${rootName}`)} (${pendingInvoices.length} Bills)
    </div>
    <div>
      <button class="print-btn" onclick="window.print()">Print Report / Save as PDF</button>
    </div>
  </div>

  <div class="header-container">
    <div>
      <h1 class="company-title">VIJAYA AGENCIES</h1>
      <h2 class="report-subtitle">PENDING BILLS STATEMENT - ${escapeHtml(isAll ? 'ALL ROUTES' : rootName.toUpperCase())}</h2>
    </div>
    <div class="meta-info">
      <div><strong>Date:</strong> ${printDateStr} ${printTimeStr}</div>
      <div><strong>Total Bills:</strong> ${pendingInvoices.length}</div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="summary-card-title">Route</div>
      <div class="summary-card-val" style="color: #1e40af;">${escapeHtml(isAll ? 'All Routes' : rootName)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Bill Amount</div>
      <div class="summary-card-val">${formatCurrency(totalBilled)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Amount Paid</div>
      <div class="summary-card-val" style="color: #047857;">${formatCurrency(totalPaid)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Amount Pending</div>
      <div class="summary-card-val" style="color: #b91c1c;">${formatCurrency(totalPending)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 38px; text-align: center;">SL.NO</th>
        ${isAll ? '<th style="text-align: left; width: 110px;">Root</th>' : ''}
        <th style="text-align: center; width: 75px;">Bill No</th>
        <th style="text-align: center; width: 80px;">Bill Date</th>
        <th style="text-align: right; width: 85px;">Amount Paid</th>
        <th style="text-align: right; width: 90px;">Bill Amount</th>
        <th style="text-align: right; width: 95px;">Amount Pending</th>
        <th style="width: 140px; min-width: 120px; text-align: center;">Amount Collected</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
    <tfoot>
      <tr class="tfoot-row">
        <td colspan="${isAll ? 4 : 3}" style="text-align: left;">TOTAL (${pendingInvoices.length} BILLS)</td>
        <td style="text-align: right; color: #047857;">${formatCurrency(totalPaid)}</td>
        <td style="text-align: right;">${formatCurrency(totalBilled)}</td>
        <td style="text-align: right; color: #b91c1c;">${formatCurrency(totalPending)}</td>
        <td style="text-align: center; width: 140px;">&nbsp;</td>
      </tr>
    </tfoot>
  </table>

  <div class="legend-box">
    <div>VIJAYA AGENCIES — Daily Route Pending Bills & Collection Sheet</div>
    <div>Generated on ${printDateStr} at ${printTimeStr}</div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Auto open print dialog after short render delay
      setTimeout(function() {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
