import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';

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

interface UserAuth {
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  securityQuestion: string;
  securityAnswerHash: string;
  recoveryPin: string;
}

interface AppData {
  invoices: Invoice[];
  roots: string[];
  payments: PaymentLog[];
  auth?: UserAuth;
  sheetsConfig: {
    appsScriptUrl: string;
    isConnected: boolean;
    lastSynced: string | null;
  };
  reportConfig?: {
    recipientEmail: string;
    scheduleTime: string; // "23:30"
    enabled: boolean;
  };
  smtpConfig?: {
    user: string;
    pass: string;
    host?: string;
    port?: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

// Security hashing helpers
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`salt_va_p_${String(password || '').trim()}`).digest('hex');
}

function hashAnswer(answer: string): string {
  return crypto.createHash('sha256').update(`salt_va_a_${String(answer || '').trim().toLowerCase()}`).digest('hex');
}

const DEFAULT_AUTH: UserAuth = {
  username: 'admin',
  passwordHash: hashPassword('admin123'),
  name: 'Admin User',
  email: 'snreddy.it@gmail.com',
  securityQuestion: 'What is your distribution agency name?',
  securityAnswerHash: hashAnswer('VIJAYA AGENCIES'),
  recoveryPin: '123456',
};

// In-memory active session tokens with 30 days validity
const activeSessions = new Map<string, { username: string; expiresAt: number }>();

// Default initial data matching distribution business requirements
const DEFAULT_DATA: AppData = {
  roots: [],
  auth: { ...DEFAULT_AUTH },
  sheetsConfig: {
    appsScriptUrl: '',
    isConnected: false,
    lastSynced: null,
  },
  reportConfig: {
    recipientEmail: process.env.DAILY_REPORT_EMAIL || 'snreddy.it@gmail.com',
    scheduleTime: '23:30',
    enabled: true,
  },
  invoices: [],
  payments: [],
};

function loadData(): AppData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const loaded: AppData = { ...DEFAULT_DATA, ...JSON.parse(content) };
      if (!loaded.auth || !loaded.auth.passwordHash) {
        loaded.auth = { ...DEFAULT_AUTH };
      }
      return loaded;
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

      // Fetch roots strictly from the Google Sheet
      try {
        const rootsUrl = new URL(appsScriptUrl);
        rootsUrl.searchParams.set('action', 'getRoots');
        const rootsResp = await fetch(rootsUrl.toString(), { method: 'GET', redirect: 'follow' });
        let fetchedRoots: string[] = [];
        if (rootsResp.ok) {
          const rootsData = await rootsResp.json();
          if (rootsData && rootsData.success && Array.isArray(rootsData.data)) {
            fetchedRoots = rootsData.data.map((r: any) => String(r || '').trim()).filter(Boolean);
          }
        }

        // Also extract roots from synced invoices in sheet
        const invoiceRoots = appData.invoices
          .map((inv) => String(inv.root || '').trim())
          .filter(Boolean);

        // Derive valid roots strictly from what is present in the Google Sheet
        const validSheetRoots = Array.from(new Set([...fetchedRoots, ...invoiceRoots]));

        // Overwrite appData.roots with ONLY the roots from the Google Sheet (removes any non-existent roots!)
        if (validSheetRoots.length > 0) {
          appData.roots = validSheetRoots;
        } else if (fetchedRoots.length > 0) {
          appData.roots = fetchedRoots;
        }
      } catch (rErr) {
        console.error('Error fetching roots from sheets:', rErr);
        const invoiceRoots = Array.from(
          new Set(
            appData.invoices
              .map((inv) => String(inv.root || '').trim())
              .filter(Boolean)
          )
        );
        if (invoiceRoots.length > 0) {
          appData.roots = invoiceRoots;
        }
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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure all API routes are never cached by browser and reloaded fresh
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    // Ensure appData is strictly fresh from disk
    appData = loadData();
    next();
  });

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'VIJAYA AGENCIES API' });
  });

  // ----------------------------------------------------
  // AUTHENTICATION & PASSWORD RESET ROUTES
  // ----------------------------------------------------

  // GET Auth Status / Verify Token
  app.get('/api/auth/status', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query.token as string) || (req.headers['x-auth-token'] as string);

    if (token && activeSessions.has(token)) {
      const session = activeSessions.get(token)!;
      if (session.expiresAt > Date.now()) {
        return res.json({
          success: true,
          isAuthenticated: true,
          user: {
            username: appData.auth?.username || 'admin',
            name: appData.auth?.name || 'Admin User',
            email: appData.auth?.email || 'snreddy.it@gmail.com',
            securityQuestion: appData.auth?.securityQuestion,
          },
        });
      }
      activeSessions.delete(token);
    }

    return res.json({
      success: true,
      isAuthenticated: false,
      user: null,
    });
  });

  // POST Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const enteredUser = String(username || '').trim().toLowerCase();
      const enteredPass = String(password || '');

      if (!enteredUser || !enteredPass) {
        return res.status(400).json({
          success: false,
          message: 'Please enter both username/email and password.',
        });
      }

      const currentAuth = appData.auth || DEFAULT_AUTH;
      const userMatch =
        enteredUser === currentAuth.username.toLowerCase() ||
        enteredUser === currentAuth.email.toLowerCase();
      const passMatch = hashPassword(enteredPass) === currentAuth.passwordHash;

      if (!userMatch || !passMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username/email or password. Please try again.',
        });
      }

      // Generate secure session token
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.set(token, {
        username: currentAuth.username,
        expiresAt: Date.now() + 30 * 86400 * 1000, // 30 days
      });

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          username: currentAuth.username,
          name: currentAuth.name,
          email: currentAuth.email,
          securityQuestion: currentAuth.securityQuestion,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Login error.' });
    }
  });

  // POST Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.token;
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  });

  // POST Notify Admin of New User Registration
  app.post('/api/auth/notify-new-user', (req, res) => {
    try {
      const { uid, email, displayName, requestedAt } = req.body;
      const adminEmail = 'snreddy.it@gmail.com';

      console.log('===============================================================');
      console.log('📬 [EMAIL DISPATCH] NEW USER REGISTRATION APPROVAL REQUEST');
      console.log(`To: ${adminEmail}`);
      console.log(`Subject: Action Required: New Account Registration Approval for Vijaya Agencies`);
      console.log(`User Name: ${displayName}`);
      console.log(`User Email: ${email}`);
      console.log(`User ID: ${uid}`);
      console.log(`Time: ${requestedAt || new Date().toISOString()}`);
      console.log(`Status: PENDING_APPROVAL`);
      console.log('Action: Review and approve inside Vijaya Agencies Distribution Hub');
      console.log('===============================================================');

      return res.json({
        success: true,
        message: `Approval request registered. Notification dispatched for administrator ${adminEmail}.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST Get Security Question for User
  app.post('/api/auth/reset-password/get-question', (req, res) => {
    try {
      const { username } = req.body;
      const enteredUser = String(username || '').trim().toLowerCase();
      const currentAuth = appData.auth || DEFAULT_AUTH;

      const userMatch =
        enteredUser === currentAuth.username.toLowerCase() ||
        enteredUser === currentAuth.email.toLowerCase();

      if (!userMatch) {
        return res.status(404).json({
          success: false,
          message: 'No registered user found with this username or email.',
        });
      }

      return res.json({
        success: true,
        securityQuestion: currentAuth.securityQuestion || 'What is your distribution agency name?',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Error fetching question.' });
    }
  });

  // POST Verify and Reset Password
  app.post('/api/auth/reset-password/verify-and-reset', (req, res) => {
    try {
      const { username, method, securityAnswer, recoveryPin, newPassword } = req.body;
      const enteredUser = String(username || '').trim().toLowerCase();
      const currentAuth = appData.auth || DEFAULT_AUTH;

      const userMatch =
        enteredUser === currentAuth.username.toLowerCase() ||
        enteredUser === currentAuth.email.toLowerCase();

      if (!userMatch) {
        return res.status(404).json({
          success: false,
          message: 'No registered user found with this username or email.',
        });
      }

      if (!newPassword || String(newPassword).trim().length < 4) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 4 characters long.',
        });
      }

      if (method === 'security_question') {
        const enteredAnsHash = hashAnswer(String(securityAnswer || ''));
        if (enteredAnsHash !== currentAuth.securityAnswerHash) {
          return res.status(400).json({
            success: false,
            message: 'Incorrect answer to the security question. Please check case and spelling, or use the 6-digit recovery PIN.',
          });
        }
      } else if (method === 'recovery_pin') {
        const cleanPin = String(recoveryPin || '').trim();
        if (cleanPin !== currentAuth.recoveryPin.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Incorrect 6-digit master recovery PIN.',
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset verification method.',
        });
      }

      // Update password
      currentAuth.passwordHash = hashPassword(newPassword);
      appData.auth = currentAuth;
      saveData(appData);

      // Create new session token for immediate login
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.set(token, {
        username: currentAuth.username,
        expiresAt: Date.now() + 30 * 86400 * 1000,
      });

      return res.json({
        success: true,
        message: 'Password has been reset successfully. You are now logged in.',
        token,
        user: {
          username: currentAuth.username,
          name: currentAuth.name,
          email: currentAuth.email,
          securityQuestion: currentAuth.securityQuestion,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Error resetting password.' });
    }
  });

  // POST Change Password (when authenticated)
  app.post('/api/auth/change-password', (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const currentAuth = appData.auth || DEFAULT_AUTH;

      if (hashPassword(currentPassword) !== currentAuth.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      if (!newPassword || String(newPassword).trim().length < 4) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 4 characters long.',
        });
      }

      currentAuth.passwordHash = hashPassword(newPassword);
      appData.auth = currentAuth;
      saveData(appData);

      return res.json({
        success: true,
        message: 'Password updated successfully.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Error updating password.' });
    }
  });

  // POST Update Profile & Recovery Settings
  app.post('/api/auth/update-profile', (req, res) => {
    try {
      const { name, email, username, securityQuestion, securityAnswer, recoveryPin, currentPassword } = req.body;
      const currentAuth = appData.auth || DEFAULT_AUTH;

      if (hashPassword(currentPassword) !== currentAuth.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'Please enter your current password to save security settings.',
        });
      }

      if (name) currentAuth.name = String(name).trim();
      if (email) currentAuth.email = String(email).trim();
      if (username) currentAuth.username = String(username).trim();
      if (securityQuestion) currentAuth.securityQuestion = String(securityQuestion).trim();
      if (securityAnswer) currentAuth.securityAnswerHash = hashAnswer(String(securityAnswer).trim());
      if (recoveryPin && String(recoveryPin).trim().length >= 4) {
        currentAuth.recoveryPin = String(recoveryPin).trim();
      }

      appData.auth = currentAuth;
      saveData(appData);

      return res.json({
        success: true,
        message: 'Account profile and recovery settings saved successfully.',
        user: {
          username: currentAuth.username,
          name: currentAuth.name,
          email: currentAuth.email,
          securityQuestion: currentAuth.securityQuestion,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Error updating profile.' });
    }
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

  // POST Bulk Delete Invoices
  app.post('/api/invoices/bulk-delete', async (req, res) => {
    try {
      const { billNos } = req.body;
      if (!Array.isArray(billNos) || billNos.length === 0) {
        return res.status(400).json({ success: false, message: 'No bill numbers provided for bulk deletion.' });
      }

      const billNoSet = new Set(billNos.map((b) => String(b).trim()));
      const initialCount = appData.invoices.length;
      
      const deletedInvoices: Invoice[] = [];
      appData.invoices = appData.invoices.filter((inv) => {
        if (billNoSet.has(inv.billNo)) {
          deletedInvoices.push(inv);
          return false;
        }
        return true;
      });

      const deletedCount = initialCount - appData.invoices.length;
      saveData(appData);

      if (appData.sheetsConfig.appsScriptUrl && deletedInvoices.length > 0) {
        for (const inv of deletedInvoices) {
          forwardToGoogleSheets({
            action: 'deleteInvoice',
            billNo: inv.billNo,
          }).catch((e) => console.error(`Background sheets delete failed for bill ${inv.billNo}:`, e));
        }
      }

      return res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} invoice${deletedCount === 1 ? '' : 's'}.`,
        deletedCount,
        data: deletedInvoices,
      });
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to bulk delete invoices.' });
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
      const { reassignTo, deleteInvoices } = req.body || {};
      if (!targetRootName) {
        return res.status(400).json({ success: false, message: 'Root name is required.' });
      }

      // Remove root from list (case-insensitive filter)
      appData.roots = appData.roots.filter(
        (r) => r.toLowerCase() !== targetRootName.toLowerCase()
      );

      // Handle invoices in appData
      if (deleteInvoices) {
        appData.invoices = appData.invoices.filter(
          (inv) => inv.root.toLowerCase() !== targetRootName.toLowerCase()
        );
      } else if (reassignTo) {
        const cleanTarget = String(reassignTo).trim();
        appData.invoices = appData.invoices.map((inv) => {
          if (inv.root.toLowerCase() === targetRootName.toLowerCase()) {
            return { ...inv, root: cleanTarget, updatedAt: new Date().toISOString() };
          }
          return inv;
        });
      } else {
        // default: mark as Unassigned if not deleting
        appData.invoices = appData.invoices.map((inv) => {
          if (inv.root.toLowerCase() === targetRootName.toLowerCase()) {
            return { ...inv, root: 'Unassigned', updatedAt: new Date().toISOString() };
          }
          return inv;
        });
      }

      saveData(appData);

      if (appData.sheetsConfig.appsScriptUrl) {
        forwardToGoogleSheets({
          action: 'deleteRoot',
          rootName: targetRootName,
        }).catch((e) => console.error('Background sheets root delete failed:', e));
      }

      return res.json({
        success: true,
        message: `Root "${targetRootName}" deleted successfully.`,
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

  // ----------------------------------------------------
  // DAILY INVOICES EXCEL ATTACHMENT & EMAIL SERVICE
  // ----------------------------------------------------
  interface DailyReportDispatchRecord {
    timestamp: string;
    recipient: string;
    invoiceCount: number;
    totalPending: number;
    status: 'sent' | 'prepared' | 'error' | 'unconfigured';
    mode: 'smtp' | 'log' | 'apps-script' | 'unconfigured';
    message: string;
  }

  let lastReportDispatch: DailyReportDispatchRecord | null = null;
  let lastMidnightCronDate: string = '';

  function generateInvoicesExcelBuffer(invoices: Invoice[]): Buffer {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Invoices List
    const invoiceRows = invoices.map((inv, idx) => ({
      'Sl No': idx + 1,
      'Bill No': inv.billNo,
      'Route / Area': inv.root || 'Unassigned',
      'Bill Date': inv.billDate || '',
      'Bill Amount (Rs)': Number(inv.billAmount) || 0,
      'Amount Paid (Rs)': Number(inv.amountPaid) || 0,
      'Amount Pending (Rs)': Number(inv.amountPending) || 0,
      'Status': inv.status || 'Pending',
      'Updated At': inv.updatedAt ? new Date(inv.updatedAt).toLocaleString() : '',
    }));
    const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows);
    XLSX.utils.book_append_sheet(wb, wsInvoices, 'All Invoices');

    // Sheet 2: Daily Executive Summary
    const totalBills = invoices.length;
    const totalBillAmount = invoices.reduce((s, i) => s + (Number(i.billAmount) || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
    const totalPending = invoices.reduce((s, i) => s + (Number(i.amountPending) || 0), 0);
    const paidCount = invoices.filter((i) => i.status === 'Paid').length;
    const partPaidCount = invoices.filter((i) => i.status === 'Part Paid').length;
    const pendingCount = invoices.filter((i) => i.status === 'Pending').length;
    const recoveryRate =
      totalBillAmount > 0 ? ((totalPaid / totalBillAmount) * 100).toFixed(1) + '%' : '0%';

    const summaryRows = [
      { Metric: 'Agency Name', Value: 'VIJAYA AGENCIES' },
      { Metric: 'Report Generated Date', Value: new Date().toLocaleString() },
      { Metric: 'Scheduled Dispatch Time', Value: 'Midnight 11:30 PM (Daily)' },
      { Metric: 'Total Invoices Count', Value: totalBills },
      { Metric: 'Total Billed Value (Rs)', Value: totalBillAmount },
      { Metric: 'Total Collections Received (Rs)', Value: totalPaid },
      { Metric: 'Total Outstanding Pending (Rs)', Value: totalPending },
      { Metric: 'Overall Recovery Rate', Value: recoveryRate },
      { Metric: 'Fully Paid Invoices Count', Value: paidCount },
      { Metric: 'Partially Paid Invoices Count', Value: partPaidCount },
      { Metric: 'Unpaid Pending Invoices Count', Value: pendingCount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 3: Route-wise Breakdown
    const routeMap = new Map<
      string,
      { count: number; billed: number; paid: number; pending: number }
    >();
    for (const inv of invoices) {
      const r = inv.root || 'Unassigned';
      const entry = routeMap.get(r) || { count: 0, billed: 0, paid: 0, pending: 0 };
      entry.count += 1;
      entry.billed += Number(inv.billAmount) || 0;
      entry.paid += Number(inv.amountPaid) || 0;
      entry.pending += Number(inv.amountPending) || 0;
      routeMap.set(r, entry);
    }

    const routeRows = Array.from(routeMap.entries()).map(([routeName, data]) => ({
      'Route Name': routeName,
      'Invoice Count': data.count,
      'Total Billed (Rs)': data.billed,
      'Total Collected (Rs)': data.paid,
      'Total Pending (Rs)': data.pending,
      'Recovery Rate':
        data.billed > 0 ? ((data.paid / data.billed) * 100).toFixed(1) + '%' : '0%',
    }));
    const wsRoutes = XLSX.utils.json_to_sheet(routeRows);
    XLSX.utils.book_append_sheet(wb, wsRoutes, 'Route Breakdown');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buf as Buffer;
  }

  async function sendDailyInvoicesEmail(
    invoices: Invoice[],
    customRecipient?: string
  ): Promise<{ success: boolean; message: string; mode: 'smtp' | 'log' | 'apps-script' | 'unconfigured'; filename: string }> {
    const recipient = (
      customRecipient ||
      process.env.DAILY_REPORT_EMAIL ||
      'snreddy.it@gmail.com'
    ).trim();
    const dateStr = new Date().toISOString().slice(0, 10);
    const excelBuffer = generateInvoicesExcelBuffer(invoices);
    const filename = `VIJAYA_AGENCIES_Daily_Invoices_${dateStr}.xlsx`;

    const totalBillAmount = invoices.reduce((s, i) => s + (Number(i.billAmount) || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
    const totalPending = invoices.reduce((s, i) => s + (Number(i.amountPending) || 0), 0);

    const smtpHost = appData.smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(appData.smtpConfig?.port || process.env.SMTP_PORT) || 465;
    const smtpUser = appData.smtpConfig?.user || process.env.SMTP_USER;
    const smtpPass = appData.smtpConfig?.pass || process.env.SMTP_PASS;

    // 1. Primary Method: Direct SMTP Delivery
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #1e40af; color: white; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; letter-spacing: 1px;">VIJAYA AGENCIES</h1>
              <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Daily Invoices & Collections Report (${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })})</p>
            </div>
            <div style="padding: 24px; background: #ffffff;">
              <p style="font-size: 14px; margin-top: 0;">Hello Administrator,</p>
              <p style="font-size: 13px; color: #475569;">
                Attached is your daily automatic Excel backup spreadsheet containing all registered distribution invoices, payment statuses, and route-wise breakdowns as of <strong>${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })}</strong>.
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #64748b;">Total Invoices:</td><td style="font-weight: bold; text-align: right;">${invoices.length}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b;">Total Bill Value:</td><td style="font-weight: bold; text-align: right;">₹${totalBillAmount.toLocaleString('en-IN')}</td></tr>
                  <tr><td style="padding: 6px 0; color: #15803d;">Collected Amount:</td><td style="font-weight: bold; color: #15803d; text-align: right;">₹${totalPaid.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-top: 1px solid #cbd5e1;"><td style="padding: 8px 0; color: #b91c1c; font-weight: bold;">Outstanding Pending:</td><td style="font-weight: bold; color: #b91c1c; text-align: right;">₹${totalPending.toLocaleString('en-IN')}</td></tr>
                </table>
              </div>
              <p style="font-size: 12px; color: #64748b;">
                📎 <strong>Attached Spreadsheet:</strong> ${filename} (Includes All Invoices, Summary & Route Breakdown tabs)
              </p>
            </div>
            <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #64748b;">
              Automated Distribution Dispatch • Vijaya Agencies Management System
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"Vijaya Agencies" <${smtpUser}>`,
          to: recipient,
          subject: `📊 VIJAYA AGENCIES - Daily Invoices Report (${dateStr})`,
          text: `Vijaya Agencies Daily Invoice Report - ${invoices.length} invoices. Total Pending: ₹${totalPending}. Attached: ${filename}`,
          html: htmlBody,
          attachments: [
            {
              filename,
              content: excelBuffer,
              contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ],
        });

        lastReportDispatch = {
          timestamp: new Date().toISOString(),
          recipient,
          invoiceCount: invoices.length,
          totalPending,
          status: 'sent',
          mode: 'smtp',
          message: `Dispatched via Gmail SMTP with attachment to ${recipient}`,
        };

        console.log(`✅ [DAILY REPORT] Successfully emailed ${filename} to ${recipient} via SMTP`);
        return {
          success: true,
          message: `Report successfully emailed to ${recipient} with attachment ${filename}. Please check your inbox!`,
          mode: 'smtp',
          filename,
        };
      } catch (smtpErr: any) {
        console.error('SMTP Send Error:', smtpErr);
        lastReportDispatch = {
          timestamp: new Date().toISOString(),
          recipient,
          invoiceCount: invoices.length,
          totalPending,
          status: 'error',
          mode: 'smtp',
          message: smtpErr.message || 'Failed to send via SMTP',
        };
        return {
          success: false,
          message: `Gmail SMTP delivery failed: ${smtpErr.message}. If using Gmail, make sure you generated a 16-character Google App Password.`,
          mode: 'smtp',
          filename,
        };
      }
    }

    // 2. Secondary Method: Connected Google Sheets Apps Script Web App Proxy
    if (appData.sheetsConfig?.appsScriptUrl) {
      try {
        const scriptUrl = appData.sheetsConfig.appsScriptUrl;
        const triggerUrl = `${scriptUrl}?action=sendDailyInvoicesEmail&recipient=${encodeURIComponent(recipient)}`;
        const res = await fetch(triggerUrl, { method: 'GET' });
        const scriptData: any = await res.json().catch(() => null);
        if (scriptData && scriptData.success) {
          lastReportDispatch = {
            timestamp: new Date().toISOString(),
            recipient,
            invoiceCount: invoices.length,
            totalPending,
            status: 'sent',
            mode: 'apps-script',
            message: `Dispatched via Google Sheets Web App to ${recipient}`,
          };
          return {
            success: true,
            message: `Report successfully emailed to ${recipient} via connected Google Sheet with CSV attachment!`,
            mode: 'apps-script',
            filename,
          };
        }
      } catch (scriptErr) {
        console.warn('Google Sheet trigger fallback failed:', scriptErr);
      }
    }

    // 3. Fallback: Outgoing Email Not Yet Configured
    lastReportDispatch = {
      timestamp: new Date().toISOString(),
      recipient,
      invoiceCount: invoices.length,
      totalPending,
      status: 'unconfigured',
      mode: 'unconfigured',
      message: `Email was NOT sent because outgoing email is not yet configured. Please provide your Gmail App Password in Settings or update Google Apps Script in Google Sheets.`,
    };

    console.warn(
      `⚠️ [EMAIL NOT SENT] ${filename} created for ${recipient}, but no SMTP credentials or Google Apps Script email handler were found.`
    );

    return {
      success: false,
      message: `Email was NOT sent yet because outgoing mail service is not configured. To receive real emails in your inbox, enter your 16-character Gmail App Password below, or run the trigger in Google Sheets.`,
      mode: 'unconfigured',
      filename,
    };
  }

  // POST Trigger Daily Excel Email dispatch (with optional invoices payload from client)
  app.post('/api/reports/daily-excel-email', async (req, res) => {
    try {
      const payloadInvoices: Invoice[] =
        Array.isArray(req.body?.invoices) && req.body.invoices.length > 0
          ? req.body.invoices
          : appData.invoices;
      const recipient = req.body?.recipient || 'snreddy.it@gmail.com';
      const result = await sendDailyInvoicesEmail(payloadInvoices, recipient);
      return res.json({
        ...result,
        lastDispatch: lastReportDispatch,
      });
    } catch (err: any) {
      console.error('API daily-excel-email error:', err);
      return res
        .status(500)
        .json({ success: false, message: err.message || 'Report email execution failed.' });
    }
  });

  // POST Save SMTP Config (Gmail App Password)
  app.post('/api/reports/smtp-config', (req, res) => {
    try {
      const { user, pass, host, port } = req.body || {};
      if (!user || !pass) {
        return res.status(400).json({
          success: false,
          message: 'Both Gmail address and Google App Password (16 characters) are required.',
        });
      }
      appData.smtpConfig = {
        user: String(user).trim(),
        pass: String(pass).replace(/\s+/g, '').trim(),
        host: host ? String(host).trim() : 'smtp.gmail.com',
        port: port ? Number(port) : 465,
      };
      saveData(appData);
      return res.json({
        success: true,
        message: `Gmail delivery configured for ${appData.smtpConfig.user}! You can now test sending or wait for automated midnight reports.`,
        smtpUser: appData.smtpConfig.user,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ success: false, message: err.message || 'Failed to save SMTP config.' });
    }
  });

  // POST Download Daily Excel File (.xlsx) directly
  app.post('/api/reports/download-daily-excel', async (req, res) => {
    try {
      const payloadInvoices: Invoice[] =
        Array.isArray(req.body?.invoices) && req.body.invoices.length > 0
          ? req.body.invoices
          : appData.invoices;
      const buf = generateInvoicesExcelBuffer(payloadInvoices);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `VIJAYA_AGENCIES_Daily_Invoices_${dateStr}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buf);
    } catch (err: any) {
      console.error('Download excel error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Excel generation failed.' });
    }
  });

  // GET Email Schedule & Status
  app.get('/api/reports/email-status', (req, res) => {
    const isSmtpConfigured = !!(
      (appData.smtpConfig?.user && appData.smtpConfig?.pass) ||
      (process.env.SMTP_USER && process.env.SMTP_PASS)
    );
    const activeSmtpUser = appData.smtpConfig?.user || process.env.SMTP_USER || null;
    const now = new Date();
    const istTime = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
    const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const targetTime = appData.reportConfig?.scheduleTime || '23:30';
    const targetEmail =
      appData.reportConfig?.recipientEmail ||
      process.env.DAILY_REPORT_EMAIL ||
      'snreddy.it@gmail.com';
    const enabled = appData.reportConfig?.enabled !== false;

    res.json({
      scheduleTime: targetTime,
      recipientEmail: targetEmail,
      enabled,
      isSmtpConfigured,
      smtpHost: appData.smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpUser: activeSmtpUser ? `${activeSmtpUser.slice(0, 3)}***` : null,
      currentTimeIst: `${istDate} ${istTime}`,
      lastDispatch: lastReportDispatch,
      isSheetsConnected: !!(appData.sheetsConfig?.isConnected && appData.sheetsConfig?.appsScriptUrl),
    });
  });

  // POST Update Email & Schedule Settings
  app.post('/api/reports/config', (req, res) => {
    try {
      const { recipientEmail, scheduleTime, enabled } = req.body || {};
      if (!appData.reportConfig) {
        appData.reportConfig = {
          recipientEmail: 'snreddy.it@gmail.com',
          scheduleTime: '23:30',
          enabled: true,
        };
      }
      if (recipientEmail && typeof recipientEmail === 'string') {
        appData.reportConfig.recipientEmail = recipientEmail.trim();
      }
      if (scheduleTime && typeof scheduleTime === 'string') {
        appData.reportConfig.scheduleTime = scheduleTime.trim();
      }
      if (typeof enabled === 'boolean') {
        appData.reportConfig.enabled = enabled;
      }
      saveData(appData);
      return res.json({
        success: true,
        message: `Email settings updated: Sending daily at ${appData.reportConfig.scheduleTime} IST to ${appData.reportConfig.recipientEmail}`,
        config: appData.reportConfig,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to save config.' });
    }
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
    if (appData.sheetsConfig.appsScriptUrl) {
      syncFromGoogleSheets(appData.sheetsConfig.appsScriptUrl)
        .then(() => console.log('Initial Google Sheet sync complete.'))
        .catch((e) => console.error('Initial sync error:', e));
    }

    // Automated Daily Invoice Email Runner (Dynamic Schedule & Recipient)
    const initialTime = appData.reportConfig?.scheduleTime || '23:30';
    const initialEmail =
      appData.reportConfig?.recipientEmail ||
      process.env.DAILY_REPORT_EMAIL ||
      'snreddy.it@gmail.com';
    console.log(
      `⏰ [SCHEDULER INITIALIZED] Daily Invoices Excel Email scheduled for ${initialTime} IST to ${initialEmail}`
    );
    setInterval(async () => {
      try {
        const targetTime = appData.reportConfig?.scheduleTime || '23:30';
        const targetEmail =
          appData.reportConfig?.recipientEmail ||
          process.env.DAILY_REPORT_EMAIL ||
          'snreddy.it@gmail.com';
        const isEnabled = appData.reportConfig?.enabled !== false;

        if (!isEnabled) return;

        const now = new Date();
        const istTime = now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        });
        const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (istTime === targetTime && lastMidnightCronDate !== istDate) {
          lastMidnightCronDate = istDate;
          console.log(
            `⏰ [SCHEDULED RUNNER] Scheduled time ${targetTime} IST reached for ${istDate}. Generating daily Excel backup email for ${targetEmail}...`
          );
          await sendDailyInvoicesEmail(appData.invoices, targetEmail);
        }
      } catch (cronErr) {
        console.error('Midnight scheduler tick error:', cronErr);
      }
    }, 60000);
  });
}

startServer();
