import express from 'express';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';

interface Invoice {
  billNo: string;
  root: string;
  billDate: string;
  billAmount: number;
  amountPaid: number;
  amountPending: number;
  status: 'Pending' | 'Part Paid' | 'Paid';
  updatedAt?: string;
}

interface PaymentLog {
  id: string;
  billNo: string;
  amount: number;
  date: string;
  timestamp: number;
  previousPaid: number;
  newPaid: number;
}

interface AppData {
  invoices: Invoice[];
  roots: string[];
  payments: PaymentLog[];
  sheetsConfig: {
    appsScriptUrl: string;
    isConnected: boolean;
    lastSynced: string | null;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

// Default initial data matching distribution business requirements
const DEFAULT_DATA: AppData = {
  roots: ['Pattapuram', 'Hyderabad', 'Vijayawada', 'Guntur', 'Visakhapatnam'],
  sheetsConfig: {
    appsScriptUrl: '',
    isConnected: false,
    lastSynced: null,
  },
  invoices: [
    {
      billNo: '1001',
      root: 'Pattapuram',
      billDate: '2026-08-18',
      billAmount: 40000,
      amountPaid: 0,
      amountPending: 40000,
      status: 'Pending',
      updatedAt: new Date().toISOString(),
    },
    {
      billNo: '1002',
      root: 'Hyderabad',
      billDate: '2026-08-19',
      billAmount: 60000,
      amountPaid: 25000,
      amountPending: 35000,
      status: 'Part Paid',
      updatedAt: new Date().toISOString(),
    },
    {
      billNo: '1003',
      root: 'Vijayawada',
      billDate: '2026-08-20',
      billAmount: 50000,
      amountPaid: 0,
      amountPending: 50000,
      status: 'Pending',
      updatedAt: new Date().toISOString(),
    },
    {
      billNo: '1004',
      root: 'Hyderabad',
      billDate: '2026-08-17',
      billAmount: 30000,
      amountPaid: 30000,
      amountPending: 0,
      status: 'Paid',
      updatedAt: new Date().toISOString(),
    },
    {
      billNo: '1005',
      root: 'Pattapuram',
      billDate: '2026-08-21',
      billAmount: 20000,
      amountPaid: 5000,
      amountPending: 15000,
      status: 'Part Paid',
      updatedAt: new Date().toISOString(),
    },
  ],
  payments: [
    {
      id: 'pay-1',
      billNo: '1002',
      amount: 25000,
      date: '2026-08-20',
      timestamp: Date.now() - 86400000,
      previousPaid: 0,
      newPaid: 25000,
    },
    {
      id: 'pay-2',
      billNo: '1004',
      amount: 30000,
      date: '2026-08-19',
      timestamp: Date.now() - 172800000,
      previousPaid: 0,
      newPaid: 30000,
    },
    {
      id: 'pay-3',
      billNo: '1005',
      amount: 5000,
      date: '2026-08-21',
      timestamp: Date.now() - 3600000,
      previousPaid: 0,
      newPaid: 5000,
    },
  ],
};

function loadData(): AppData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return { ...DEFAULT_DATA, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error('Error reading database file, using defaults:', err);
  }
  saveData(DEFAULT_DATA);
  return DEFAULT_DATA;
}

function saveData(data: AppData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

let appData = loadData();

// Helper to calculate Pending & Status strictly following instructions
function calculatePendingAndStatus(billAmount: number, amountPaid: number) {
  const safeBillAmount = Math.max(0, Number(billAmount) || 0);
  const safeAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const amountPending = Math.max(0, safeBillAmount - safeAmountPaid);
  
  let status: 'Pending' | 'Part Paid' | 'Paid' = 'Pending';
  if (safeAmountPaid >= safeBillAmount && safeBillAmount > 0) {
    status = 'Paid';
  } else if (safeAmountPaid > 0) {
    status = 'Part Paid';
  }

  return { amountPending, status };
}

// Sync with Google Apps Script if URL provided
async function syncFromGoogleSheets(appsScriptUrl: string) {
  if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
    return false;
  }
  try {
    const url = new URL(appsScriptUrl);
    url.searchParams.set('action', 'getInvoices');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    
    if (!response.ok) return false;
    const result = await response.json();
    if (result && result.success && Array.isArray(result.data)) {
      // update local cache with Google Sheet as single source of truth
      appData.invoices = result.data.map((inv: any) => {
        const billAmount = Number(inv.billAmount) || 0;
        const amountPaid = Number(inv.amountPaid) || 0;
        const { amountPending, status } = calculatePendingAndStatus(billAmount, amountPaid);
        return {
          billNo: String(inv.billNo).trim(),
          root: String(inv.root || ''),
          billDate: String(inv.billDate || ''),
          billAmount: billAmount,
          amountPaid: amountPaid,
          amountPending: amountPending,
          status: status,
          updatedAt: new Date().toISOString(),
        };
      });

      // also fetch roots
      try {
        const rootsUrl = new URL(appsScriptUrl);
        rootsUrl.searchParams.set('action', 'getRoots');
        const rootsResp = await fetch(rootsUrl.toString(), { method: 'GET', redirect: 'follow' });
        if (rootsResp.ok) {
          const rootsData = await rootsResp.json();
          if (rootsData && rootsData.success && Array.isArray(rootsData.data)) {
            const uniqueRoots = Array.from(new Set([...appData.roots, ...rootsData.data]));
            appData.roots = uniqueRoots;
          }
        }
      } catch (rErr) {
        console.error('Error fetching roots from sheets:', rErr);
      }

      appData.sheetsConfig.isConnected = true;
      appData.sheetsConfig.lastSynced = new Date().toISOString();
      saveData(appData);
      return true;
    }
  } catch (err) {
    console.error('Error syncing from Google Sheets:', err);
  }
  return false;
}

// Push an action to Google Apps Script if connected
async function forwardToGoogleSheets(payload: any) {
  const url = appData.sheetsConfig.appsScriptUrl;
  if (!url || !url.startsWith('http')) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error('Error forwarding to Google Sheets:', err);
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Permissive headers for Google Sites iframe embedding & API access
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'VIJAYA AGENCIES API' });
  });

  // GET All Invoices
  app.get('/api/invoices', async (req, res) => {
    res.json({
      success: true,
      data: appData.invoices,
      meta: {
        total: appData.invoices.length,
        isConnected: appData.sheetsConfig.isConnected,
        lastSynced: appData.sheetsConfig.lastSynced,
      },
    });
  });

  // POST Add Invoice
  app.post('/api/invoices', async (req, res) => {
    try {
      const { billNo, root, billDate, billAmount, amountPaid } = req.body;
      
      const cleanBillNo = String(billNo || '').trim();
      
      // 1. Validation: Bill No is numbers only
      if (!cleanBillNo) {
        return res.status(400).json({ success: false, message: 'Bill No is required' });
      }
      if (!/^\d+$/.test(cleanBillNo)) {
        return res.status(400).json({
          success: false,
          message: 'Bill No must contain numbers only (no letters, spaces, or special characters).',
        });
      }

      // 2. Check for duplicate Bill No
      const exists = appData.invoices.some((inv) => inv.billNo === cleanBillNo);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'This Bill No already exists.',
        });
      }

      const numBillAmount = Math.max(0, Number(billAmount) || 0);
      const numAmountPaid = Math.max(0, Number(amountPaid) || 0);
      
      if (numBillAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Bill Amount must be a positive number greater than 0.',
        });
      }

      // 3. Automatic calculation
      const { amountPending, status } = calculatePendingAndStatus(numBillAmount, numAmountPaid);

      const newInvoice: Invoice = {
        billNo: cleanBillNo,
        root: String(root || 'Pattapuram').trim(),
        billDate: String(billDate || new Date().toISOString().split('T')[0]),
        billAmount: numBillAmount,
        amountPaid: numAmountPaid,
        amountPending: amountPending,
        status: status,
        updatedAt: new Date().toISOString(),
      };

      // Add to local database
      appData.invoices.unshift(newInvoice);
      saveData(appData);

      // Forward to Google Sheets if configured
      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'addInvoice',
          data: newInvoice,
        }).catch((e) => console.error('Background sheets forward failed:', e));
      }

      return res.status(201).json({
        success: true,
        message: 'Invoice saved successfully.',
        data: newInvoice,
      });
    } catch (err: any) {
      console.error('Error adding invoice:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to save invoice.' });
    }
  });

  // POST Record Payment
  app.post('/api/invoices/payment', async (req, res) => {
    try {
      const { billNo, currentPayment } = req.body;
      const cleanBillNo = String(billNo || '').trim();
      const paymentAmount = Number(currentPayment);

      if (!cleanBillNo) {
        return res.status(400).json({ success: false, message: 'Bill No is required.' });
      }

      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Current Payment must be a positive number.',
        });
      }

      const invoiceIndex = appData.invoices.findIndex((inv) => inv.billNo === cleanBillNo);
      if (invoiceIndex === -1) {
        return res.status(404).json({ success: false, message: `Bill No ${cleanBillNo} not found.` });
      }

      const invoice = appData.invoices[invoiceIndex];
      const previousAmountPaid = invoice.amountPaid || 0;
      const newAmountPaid = previousAmountPaid + paymentAmount;
      
      const { amountPending, status } = calculatePendingAndStatus(invoice.billAmount, newAmountPaid);

      invoice.amountPaid = newAmountPaid;
      invoice.amountPending = amountPending;
      invoice.status = status;
      invoice.updatedAt = new Date().toISOString();

      // Record payment log
      const paymentLog: PaymentLog = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        billNo: cleanBillNo,
        amount: paymentAmount,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        previousPaid: previousAmountPaid,
        newPaid: newAmountPaid,
      };
      appData.payments.unshift(paymentLog);

      saveData(appData);

      // Forward to Google Sheets if connected
      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'addPayment',
          billNo: cleanBillNo,
          currentPayment: paymentAmount,
        }).catch((e) => console.error('Background sheets payment sync failed:', e));
      }

      return res.json({
        success: true,
        message: 'Payment recorded successfully.',
        data: invoice,
        payment: paymentLog,
      });
    } catch (err: any) {
      console.error('Error recording payment:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to record payment.' });
    }
  });

  // PUT Update Invoice
  app.put('/api/invoices/:billNo', async (req, res) => {
    try {
      const cleanBillNo = String(req.params.billNo || '').trim();
      const invoiceIndex = appData.invoices.findIndex((inv) => inv.billNo === cleanBillNo);
      
      if (invoiceIndex === -1) {
        return res.status(404).json({ success: false, message: 'Invoice not found.' });
      }

      const { root, billDate, billAmount, amountPaid } = req.body;
      const current = appData.invoices[invoiceIndex];

      const newBillAmount = billAmount !== undefined ? Math.max(0, Number(billAmount)) : current.billAmount;
      const newAmountPaid = amountPaid !== undefined ? Math.max(0, Number(amountPaid)) : current.amountPaid;

      const { amountPending, status } = calculatePendingAndStatus(newBillAmount, newAmountPaid);

      appData.invoices[invoiceIndex] = {
        ...current,
        root: root !== undefined ? String(root).trim() : current.root,
        billDate: billDate !== undefined ? String(billDate) : current.billDate,
        billAmount: newBillAmount,
        amountPaid: newAmountPaid,
        amountPending: amountPending,
        status: status,
        updatedAt: new Date().toISOString(),
      };

      saveData(appData);

      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'updateInvoice',
          data: appData.invoices[invoiceIndex],
        }).catch((e) => console.error('Background sheets update failed:', e));
      }

      return res.json({
        success: true,
        message: 'Invoice updated successfully.',
        data: appData.invoices[invoiceIndex],
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to update invoice.' });
    }
  });

  // DELETE Invoice
  app.delete('/api/invoices/:billNo', async (req, res) => {
    try {
      const cleanBillNo = String(req.params.billNo || '').trim();
      const invoiceIndex = appData.invoices.findIndex((inv) => inv.billNo === cleanBillNo);
      
      if (invoiceIndex === -1) {
        return res.status(404).json({ success: false, message: 'Invoice not found.' });
      }

      const deleted = appData.invoices.splice(invoiceIndex, 1)[0];
      saveData(appData);

      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'deleteInvoice',
          billNo: cleanBillNo,
        }).catch((e) => console.error('Background sheets delete failed:', e));
      }

      return res.json({
        success: true,
        message: 'Invoice deleted successfully.',
        data: deleted,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to delete invoice.' });
    }
  });

  // GET Roots
  app.get('/api/roots', (req, res) => {
    res.json({ success: true, data: appData.roots });
  });

  // POST Add Root
  app.post('/api/roots', async (req, res) => {
    try {
      const { rootName } = req.body;
      const cleanName = String(rootName || '').trim();
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Root name cannot be empty.' });
      }

      const exists = appData.roots.some((r) => r.toLowerCase() === cleanName.toLowerCase());
      if (!exists) {
        appData.roots.push(cleanName);
        saveData(appData);

        if (appData.sheetsConfig.appsScriptUrl) {
          forwardToGoogleSheets({
            action: 'addRoot',
            rootName: cleanName,
          }).catch((e) => console.error('Background sheets root add failed:', e));
        }
      }

      return res.json({ success: true, message: 'Root added successfully.', data: appData.roots });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to add root.' });
    }
  });

  // PUT Update/Rename Root
  app.put('/api/roots/:rootName', async (req, res) => {
    try {
      const oldRootName = String(req.params.rootName || '').trim();
      const { newRootName } = req.body;
      const cleanNewName = String(newRootName || '').trim();

      if (!cleanNewName) {
        return res.status(400).json({ success: false, message: 'New root name cannot be empty.' });
      }

      const rootIndex = appData.roots.findIndex((r) => r.toLowerCase() === oldRootName.toLowerCase());
      if (rootIndex === -1) {
        return res.status(404).json({ success: false, message: `Root "${oldRootName}" not found.` });
      }

      // Check if target name already exists
      const targetExists = appData.roots.some(
        (r, idx) => idx !== rootIndex && r.toLowerCase() === cleanNewName.toLowerCase()
      );
      if (targetExists) {
        return res.status(400).json({ success: false, message: `Root "${cleanNewName}" already exists.` });
      }

      // Update root name in list
      appData.roots[rootIndex] = cleanNewName;

      // Update invoices that reference this root
      let updatedCount = 0;
      appData.invoices = appData.invoices.map((inv) => {
        if (inv.root.toLowerCase() === oldRootName.toLowerCase()) {
          updatedCount++;
          return { ...inv, root: cleanNewName, updatedAt: new Date().toISOString() };
        }
        return inv;
      });

      saveData(appData);

      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'updateRoot',
          oldRootName: oldRootName,
          newRootName: cleanNewName,
        }).catch((e) => console.error('Background sheets root update failed:', e));
      }

      return res.json({
        success: true,
        message: `Root updated to "${cleanNewName}". ${updatedCount} invoices updated.`,
        data: { roots: appData.roots, updatedInvoicesCount: updatedCount },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to update root.' });
    }
  });

  // DELETE Root
  app.delete('/api/roots/:rootName', async (req, res) => {
    try {
      const targetRootName = String(req.params.rootName || '').trim();
      if (!targetRootName) {
        return res.status(400).json({ success: false, message: 'Root name is required.' });
      }

      const rootIndex = appData.roots.findIndex(
        (r) => r.toLowerCase() === targetRootName.toLowerCase()
      );

      if (rootIndex === -1) {
        return res.status(404).json({ success: false, message: `Root "${targetRootName}" not found.` });
      }

      // Remove root from list
      const deletedRoot = appData.roots.splice(rootIndex, 1)[0];
      saveData(appData);

      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'deleteRoot',
          rootName: targetRootName,
        }).catch((e) => console.error('Background sheets root delete failed:', e));
      }

      return res.json({
        success: true,
        message: `Root "${deletedRoot}" deleted successfully.`,
        data: appData.roots,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to delete root.' });
    }
  });

  // GET Sheets Config
  app.get('/api/sheets-config', (req, res) => {
    res.json({
      success: true,
      data: appData.sheetsConfig,
    });
  });

  // POST Sheets Config & Test Connection
  app.post('/api/sheets-config', async (req, res) => {
    try {
      const { appsScriptUrl } = req.body;
      const cleanUrl = String(appsScriptUrl || '').trim();

      if (!cleanUrl) {
        appData.sheetsConfig.appsScriptUrl = '';
        appData.sheetsConfig.isConnected = false;
        saveData(appData);
        return res.json({
          success: true,
          message: 'Google Sheets link removed. Using local database storage.',
          data: appData.sheetsConfig,
        });
      }

      // Test connection and sync
      const synced = await syncFromGoogleSheets(cleanUrl);
      if (synced) {
        appData.sheetsConfig.appsScriptUrl = cleanUrl;
        appData.sheetsConfig.isConnected = true;
        appData.sheetsConfig.lastSynced = new Date().toISOString();
        saveData(appData);
        return res.json({
          success: true,
          message: 'Successfully connected and synced with Google Sheets!',
          data: appData.sheetsConfig,
        });
      } else {
        // Still save URL but flag as connection issue
        appData.sheetsConfig.appsScriptUrl = cleanUrl;
        appData.sheetsConfig.isConnected = false;
        saveData(appData);
        return res.status(400).json({
          success: false,
          message: 'Could not connect to Google Apps Script. Please verify the URL and ensure "Who has access: Anyone" is selected.',
          data: appData.sheetsConfig,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to save configuration.' });
    }
  });

  // POST Force Sync
  app.post('/api/sync', async (req, res) => {
    if (!appData.sheetsConfig.appsScriptUrl) {
      return res.json({
        success: true,
        message: 'No Google Sheet connected. Local storage is up to date.',
        synced: false,
      });
    }
    const success = await syncFromGoogleSheets(appData.sheetsConfig.appsScriptUrl);
    return res.json({
      success,
      message: success ? 'Google Sheets synced successfully!' : 'Failed to sync with Google Sheets.',
      lastSynced: appData.sheetsConfig.lastSynced,
    });
  });

  // GET Download Complete Project Source Code (.zip)
  app.get('/api/export-project-source', async (req, res) => {
    try {
      const zip = new JSZip();
      const rootDir = process.cwd();

      // Recursive file collector
      const addDirectoryToZip = (currentDir: string, relativePath = '') => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const entryName = entry.name;
          // Ignore heavy or temporary build directories
          if (
            entryName === 'node_modules' ||
            entryName === 'dist' ||
            entryName === '.git' ||
            entryName === '.cache' ||
            entryName.endsWith('.log')
          ) {
            continue;
          }

          const fullPath = path.join(currentDir, entryName);
          const zipPath = relativePath ? `${relativePath}/${entryName}` : entryName;

          if (entry.isDirectory()) {
            addDirectoryToZip(fullPath, zipPath);
          } else if (entry.isFile()) {
            try {
              const fileData = fs.readFileSync(fullPath);
              zip.file(zipPath, fileData);
            } catch (readErr) {
              console.error(`Skipping unreadable file ${fullPath}:`, readErr);
            }
          }
        }
      };

      addDirectoryToZip(rootDir);

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const filename = `vijaya_agencies_source_code_${new Date().toISOString().slice(0, 10)}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', zipBuffer.length);
      return res.send(zipBuffer);
    } catch (err: any) {
      console.error('Error generating project source zip:', err);
      return res.status(500).json({ success: false, message: 'Failed to create source code zip.' });
    }
  });

  // ----------------------------------------------------
  // VITE OR STATIC SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VIJAYA AGENCIES Server running on http://localhost:${PORT}`);
  });
}

startServer();
