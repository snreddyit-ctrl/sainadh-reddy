import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice, InvoiceStatus } from '../types';

export const DEFAULT_ROOTS = [
  'CHOWTRA (CADBURY)',
  'PONNUR ROAD ( CADBURY)',
  'NEHRU NAGAR ( CADBURY )',
  'OLD GUNTUR ( CADBURY)',
  'NANDIVELUGU ROAD( CADBURY)',
  'MANGALDAS NAGAR ( CADBURY)',
  'RAILPETA ( CADBURY)',
  'VEG MARKET ( CADBURY)',
  'R AGRAHARAM ( CADBURY)',
  'NAGARAMPALEM ( CADBURY)',
  'RTC COLONY ( CADBURY )',
  'OLD CLUB ROAD ( CADBURY )',
];

const INVOICES_COL = 'invoices';
const PAYMENTS_COL = 'payments';
const ROOTS_COL = 'roots';

export const firestoreService = {
  // ----------------------------------------------------
  // ROOTS
  // ----------------------------------------------------
  async getRoots(): Promise<string[]> {
    try {
      const snap = await getDocs(collection(db, ROOTS_COL));
      const roots: string[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.name && typeof data.name === 'string' && data.name.trim()) {
          const clean = data.name.trim();
          if (!roots.includes(clean)) {
            roots.push(clean);
          }
        }
      });
      roots.sort((a, b) => a.localeCompare(b));
      return roots;
    } catch (err) {
      console.error('Firestore getRoots failed:', err);
      return [];
    }
  },

  // Real-time listener for roots
  subscribeRoots(callback: (roots: string[]) => void): () => void {
    return onSnapshot(
      collection(db, ROOTS_COL),
      (snap) => {
        const roots: string[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.name && typeof data.name === 'string' && data.name.trim()) {
            const clean = data.name.trim();
            if (!roots.includes(clean)) {
              roots.push(clean);
            }
          }
        });
        roots.sort((a, b) => a.localeCompare(b));
        callback(roots);
      },
      (err) => {
        console.warn('Firestore subscribeRoots error:', err);
      }
    );
  },

  // Ensure any routes found on invoices are registered into the roots collection
  async syncInvoiceRootsToCollection(invoices: Invoice[]): Promise<string[]> {
    try {
      const currentRoots = await this.getRoots();
      const currentLower = new Set(currentRoots.map((r) => r.toLowerCase()));
      const missing = new Set<string>();

      invoices.forEach((inv) => {
        const r = (inv.root || '').trim();
        if (r && r.toLowerCase() !== 'unassigned' && !currentLower.has(r.toLowerCase())) {
          missing.add(r);
        }
      });

      if (missing.size > 0) {
        const batch = writeBatch(db);
        for (const rootName of missing) {
          const docRef = doc(collection(db, ROOTS_COL));
          batch.set(docRef, {
            name: rootName,
            createdAt: new Date().toISOString(),
          });
        }
        await batch.commit();
        return await this.getRoots();
      }
      return currentRoots;
    } catch (err) {
      console.warn('syncInvoiceRootsToCollection error:', err);
      return await this.getRoots();
    }
  },

  async seedDefaultRoots(): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const rootName of DEFAULT_ROOTS) {
        const docRef = doc(collection(db, ROOTS_COL));
        batch.set(docRef, {
          name: rootName,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    } catch (err) {
      console.warn('Could not seed roots to Firestore:', err);
    }
  },

  async syncInitialDataIfEmpty(initialInvoices: Invoice[], initialRoots: string[]): Promise<void> {
    try {
      const invSnap = await getDocs(collection(db, INVOICES_COL));
      if (invSnap.empty && initialInvoices && initialInvoices.length > 0) {
        console.log(`Migrating ${initialInvoices.length} invoices to Firebase Firestore...`);
        const chunkSize = 400;
        for (let i = 0; i < initialInvoices.length; i += chunkSize) {
          const chunk = initialInvoices.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const inv of chunk) {
            const docRef = doc(collection(db, INVOICES_COL));
            batch.set(docRef, {
              ...inv,
              createdAt: inv.updatedAt || new Date().toISOString(),
            });
          }
          await batch.commit();
        }
      }

      const rootSnap = await getDocs(collection(db, ROOTS_COL));
      if (rootSnap.empty && initialRoots && initialRoots.length > 0) {
        const batch = writeBatch(db);
        for (const r of initialRoots) {
          const docRef = doc(collection(db, ROOTS_COL));
          batch.set(docRef, {
            name: r,
            createdAt: new Date().toISOString(),
          });
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('Initial data migration to Firestore error:', err);
    }
  },

  async addRoot(rootName: string): Promise<{ success: boolean; data?: string[]; message?: string }> {
    const clean = rootName.trim();
    if (!clean) return { success: false, message: 'Root name cannot be empty.' };

    try {
      const currentRoots = await this.getRoots();
      if (currentRoots.some((r) => r.toLowerCase() === clean.toLowerCase())) {
        return { success: false, message: `Root "${clean}" already exists.` };
      }

      await addDoc(collection(db, ROOTS_COL), {
        name: clean,
        createdAt: new Date().toISOString(),
      });

      const updated = await this.getRoots();
      return { success: true, data: updated };
    } catch (err: any) {
      console.error('Firestore addRoot failed:', err);
      return { success: false, message: err.message || 'Failed to add root.' };
    }
  },

  async updateRoot(
    oldRootName: string,
    newRootName: string
  ): Promise<{ success: boolean; data?: { roots: string[]; updatedInvoicesCount: number }; message?: string }> {
    const cleanOld = oldRootName.trim();
    const cleanNew = newRootName.trim();
    if (!cleanOld || !cleanNew) return { success: false, message: 'Root name cannot be empty.' };

    try {
      const batch = writeBatch(db);

      // 1. Update root document in roots collection
      const rootSnap = await getDocs(collection(db, ROOTS_COL));
      rootSnap.forEach((d) => {
        const docName = String(d.data().name || '').trim();
        if (docName.toLowerCase() === cleanOld.toLowerCase()) {
          batch.update(d.ref, { name: cleanNew });
        }
      });

      // 2. Update invoices referencing this root
      const invSnap = await getDocs(collection(db, INVOICES_COL));
      let updatedInvoicesCount = 0;
      invSnap.forEach((d) => {
        const invRoot = String(d.data().root || '').trim();
        if (invRoot.toLowerCase() === cleanOld.toLowerCase()) {
          batch.update(d.ref, { root: cleanNew, updatedAt: new Date().toISOString() });
          updatedInvoicesCount++;
        }
      });

      await batch.commit();
      const updatedRoots = await this.getRoots();
      return { success: true, data: { roots: updatedRoots, updatedInvoicesCount } };
    } catch (err: any) {
      console.error('Firestore updateRoot failed:', err);
      return { success: false, message: err.message || 'Failed to rename root.' };
    }
  },

  async deleteRoot(
    rootName: string,
    options?: {
      reassignTo?: string;
      deleteInvoices?: boolean;
    }
  ): Promise<{
    success: boolean;
    data?: string[];
    affectedInvoicesCount?: number;
    message?: string;
  }> {
    const clean = rootName.trim();
    if (!clean) return { success: false, message: 'Root name cannot be empty.' };

    try {
      const batch = writeBatch(db);

      // 1. Delete matching root documents (case-insensitive & whitespace-safe)
      const rootSnap = await getDocs(collection(db, ROOTS_COL));
      let matchedRootsCount = 0;
      rootSnap.forEach((d) => {
        const docName = String(d.data().name || '').trim();
        if (docName.toLowerCase() === clean.toLowerCase()) {
          batch.delete(d.ref);
          matchedRootsCount++;
        }
      });

      // 2. Process invoices referencing this root
      const invSnap = await getDocs(collection(db, INVOICES_COL));
      let affectedInvoicesCount = 0;
      const invoiceNosToDelete: string[] = [];

      invSnap.forEach((d) => {
        const invRoot = String(d.data().root || '').trim();
        if (invRoot.toLowerCase() === clean.toLowerCase()) {
          affectedInvoicesCount++;
          if (options?.deleteInvoices) {
            batch.delete(d.ref);
            if (d.data().billNo) {
              invoiceNosToDelete.push(String(d.data().billNo).trim());
            }
          } else {
            const targetRoot = options?.reassignTo?.trim() || 'Unassigned';
            batch.update(d.ref, {
              root: targetRoot,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });

      // 3. If invoices were deleted, also delete their payments
      if (options?.deleteInvoices && invoiceNosToDelete.length > 0) {
        const paySnap = await getDocs(collection(db, PAYMENTS_COL));
        paySnap.forEach((d) => {
          const p = d.data();
          const pBillNo = String(p.billNo || '').trim();
          if (invoiceNosToDelete.includes(pBillNo)) {
            batch.delete(d.ref);
          }
        });
      }

      await batch.commit();

      const updated = await this.getRoots();
      return {
        success: true,
        data: updated,
        affectedInvoicesCount,
        message: `Route "${clean}" deleted successfully.${
          affectedInvoicesCount > 0
            ? options?.deleteInvoices
              ? ` Also deleted ${affectedInvoicesCount} associated invoices.`
              : ` Reassigned ${affectedInvoicesCount} invoices to "${options?.reassignTo || 'Unassigned'}".`
            : ''
        }`,
      };
    } catch (err: any) {
      console.error('Firestore deleteRoot failed:', err);
      return { success: false, message: err.message || 'Failed to delete root.' };
    }
  },

  // Remove all unused routes that have 0 invoices associated
  async deleteUnusedRoots(invoices: Invoice[]): Promise<{
    success: boolean;
    data?: string[];
    deletedCount: number;
    message?: string;
  }> {
    try {
      const activeRootsLower = new Set(
        invoices.map((i) => (i.root || '').trim().toLowerCase()).filter(Boolean)
      );
      const rootSnap = await getDocs(collection(db, ROOTS_COL));
      const batch = writeBatch(db);
      let deletedCount = 0;

      rootSnap.forEach((d) => {
        const docName = String(d.data().name || '').trim();
        if (docName && !activeRootsLower.has(docName.toLowerCase())) {
          batch.delete(d.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
      }

      const updated = await this.getRoots();
      return {
        success: true,
        data: updated,
        deletedCount,
        message: `Successfully removed ${deletedCount} unused routes with 0 bills.`,
      };
    } catch (err: any) {
      console.error('Firestore deleteUnusedRoots failed:', err);
      return { success: false, deletedCount: 0, message: err.message || 'Failed to remove unused roots.' };
    }
  },

  // ----------------------------------------------------
  // INVOICES
  // ----------------------------------------------------
  async getInvoices(): Promise<Invoice[]> {
    try {
      const snap = await getDocs(collection(db, INVOICES_COL));
      const invoices: Invoice[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        const billAmount = Number(data.billAmount) || 0;
        const amountPaid = Number(data.amountPaid) || 0;
        const amountPending = Math.max(0, billAmount - amountPaid);
        let status: InvoiceStatus = 'Pending';
        if (amountPending <= 0 && billAmount > 0) {
          status = 'Paid';
        } else if (amountPaid > 0) {
          status = 'Part Paid';
        }

        invoices.push({
          billNo: String(data.billNo || '').trim(),
          root: String(data.root || '').trim(),
          billDate: String(data.billDate || data.date || '').trim(),
          billAmount,
          amountPaid,
          amountPending,
          status,
          updatedAt: data.updatedAt || undefined,
          notes: data.notes || '',
        });
      });

      // Sort by date descending, then billNo
      invoices.sort((a, b) => {
        const d1 = new Date(a.billDate).getTime() || 0;
        const d2 = new Date(b.billDate).getTime() || 0;
        return d2 - d1;
      });

      return invoices;
    } catch (err) {
      console.error('Firestore getInvoices failed:', err);
      return [];
    }
  },

  // Real-time listener for invoices
  subscribeInvoices(callback: (invoices: Invoice[]) => void): () => void {
    return onSnapshot(
      collection(db, INVOICES_COL),
      (snap) => {
        const invoices: Invoice[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const billAmount = Number(data.billAmount) || 0;
          const amountPaid = Number(data.amountPaid) || 0;
          const amountPending = Math.max(0, billAmount - amountPaid);
          let status: InvoiceStatus = 'Pending';
          if (amountPending <= 0 && billAmount > 0) {
            status = 'Paid';
          } else if (amountPaid > 0) {
            status = 'Part Paid';
          }

          invoices.push({
            billNo: String(data.billNo || '').trim(),
            root: String(data.root || '').trim(),
            billDate: String(data.billDate || data.date || '').trim(),
            billAmount,
            amountPaid,
            amountPending,
            status,
            updatedAt: data.updatedAt || undefined,
            notes: data.notes || '',
          });
        });

        invoices.sort((a, b) => {
          const d1 = new Date(a.billDate).getTime() || 0;
          const d2 = new Date(b.billDate).getTime() || 0;
          return d2 - d1;
        });

        callback(invoices);
      },
      (err) => {
        console.error('Firestore invoices snapshot error:', err);
      }
    );
  },

  async addInvoice(data: {
    billNo: string;
    root: string;
    billDate: string;
    billAmount: number;
    amountPaid: number;
    notes?: string;
    userId?: string;
  }): Promise<{ success: boolean; data?: Invoice; message?: string }> {
    const cleanBillNo = String(data.billNo || '').trim();
    const cleanRoot = String(data.root || '').trim();
    if (!cleanBillNo) return { success: false, message: 'Bill No is required.' };
    if (!cleanRoot) return { success: false, message: 'Root is required.' };

    const billAmount = Math.max(0, Number(data.billAmount) || 0);
    const amountPaid = Math.max(0, Number(data.amountPaid) || 0);
    const amountPending = Math.max(0, billAmount - amountPaid);
    let status: InvoiceStatus = 'Pending';
    if (amountPending <= 0 && billAmount > 0) {
      status = 'Paid';
    } else if (amountPaid > 0) {
      status = 'Part Paid';
    }

    const nowIso = new Date().toISOString();
    const newInvoice: Invoice = {
      billNo: cleanBillNo,
      root: cleanRoot,
      billDate: data.billDate || nowIso.split('T')[0],
      billAmount,
      amountPaid,
      amountPending,
      status,
      updatedAt: nowIso,
      notes: data.notes || '',
    };

    try {
      // Add document to Firestore
      await addDoc(collection(db, INVOICES_COL), {
        ...newInvoice,
        userId: data.userId || null,
        createdAt: nowIso,
      });

      // If initial payment was made, log into payments collection as well
      if (amountPaid > 0) {
        await addDoc(collection(db, PAYMENTS_COL), {
          billNo: cleanBillNo,
          amount: amountPaid,
          paymentDate: data.billDate || nowIso.split('T')[0],
          paymentMode: 'Cash',
          root: cleanRoot,
          notes: 'Initial invoice payment',
          createdAt: nowIso,
          userId: data.userId || null,
        });
      }

      return { success: true, data: newInvoice };
    } catch (err: any) {
      console.error('Firestore addInvoice error:', err);
      return { success: false, message: err.message || 'Failed to save invoice to Firebase.' };
    }
  },

  async addPayment(
    billNo: string,
    currentPayment: number,
    userId?: string
  ): Promise<{ success: boolean; data?: Invoice; message?: string }> {
    const cleanBillNo = String(billNo || '').trim();
    const numPayment = Math.max(0, Number(currentPayment) || 0);

    if (!cleanBillNo) return { success: false, message: 'Bill No is required.' };
    if (numPayment <= 0) return { success: false, message: 'Payment amount must be greater than zero.' };

    try {
      // Query document by billNo
      const q = query(collection(db, INVOICES_COL), where('billNo', '==', cleanBillNo));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: `Invoice #${cleanBillNo} not found.` };
      }

      // Pick first matching doc
      const targetDoc = snap.docs[0];
      const invData = targetDoc.data();
      const currentPaid = Number(invData.amountPaid) || 0;
      const totalBill = Number(invData.billAmount) || 0;

      const newPaid = currentPaid + numPayment;
      const newPending = Math.max(0, totalBill - newPaid);
      let newStatus: InvoiceStatus = 'Pending';
      if (newPending <= 0 && totalBill > 0) {
        newStatus = 'Paid';
      } else if (newPaid > 0) {
        newStatus = 'Part Paid';
      }

      const nowIso = new Date().toISOString();

      await updateDoc(targetDoc.ref, {
        amountPaid: newPaid,
        amountPending: newPending,
        status: newStatus,
        updatedAt: nowIso,
      });

      // Log transaction
      await addDoc(collection(db, PAYMENTS_COL), {
        billNo: cleanBillNo,
        amount: numPayment,
        paymentDate: nowIso.split('T')[0],
        paymentMode: 'Cash',
        root: invData.root || '',
        createdAt: nowIso,
        userId: userId || null,
      });

      const updatedInvoice: Invoice = {
        billNo: cleanBillNo,
        root: invData.root || '',
        billDate: invData.billDate || invData.date || nowIso.split('T')[0],
        billAmount: totalBill,
        amountPaid: newPaid,
        amountPending: newPending,
        status: newStatus,
        updatedAt: nowIso,
        notes: invData.notes || '',
      };

      return { success: true, data: updatedInvoice };
    } catch (err: any) {
      console.error('Firestore addPayment error:', err);
      return { success: false, message: err.message || 'Failed to record payment in Firebase.' };
    }
  },

  async updateInvoice(billNo: string, data: Partial<Invoice>): Promise<{ success: boolean; data?: Invoice; message?: string }> {
    const cleanBillNo = String(billNo || '').trim();
    try {
      const q = query(collection(db, INVOICES_COL), where('billNo', '==', cleanBillNo));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: `Invoice #${cleanBillNo} not found.` };
      }

      const targetDoc = snap.docs[0];
      const prev = targetDoc.data();

      const newBillAmount = data.billAmount !== undefined ? Number(data.billAmount) : Number(prev.billAmount) || 0;
      const newAmountPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : Number(prev.amountPaid) || 0;
      const newPending = Math.max(0, newBillAmount - newAmountPaid);

      let newStatus: InvoiceStatus = 'Pending';
      if (newPending <= 0 && newBillAmount > 0) {
        newStatus = 'Paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'Part Paid';
      }

      const nowIso = new Date().toISOString();
      const updates: any = {
        ...data,
        billAmount: newBillAmount,
        amountPaid: newAmountPaid,
        amountPending: newPending,
        status: newStatus,
        updatedAt: nowIso,
      };

      await updateDoc(targetDoc.ref, updates);

      const updated: Invoice = {
        billNo: data.billNo || prev.billNo,
        root: data.root || prev.root,
        billDate: data.billDate || prev.billDate,
        billAmount: newBillAmount,
        amountPaid: newAmountPaid,
        amountPending: newPending,
        status: newStatus,
        updatedAt: nowIso,
        notes: data.notes !== undefined ? data.notes : prev.notes,
      };

      return { success: true, data: updated };
    } catch (err: any) {
      console.error('Firestore updateInvoice error:', err);
      return { success: false, message: err.message || 'Failed to update invoice in Firebase.' };
    }
  },

  async deleteInvoice(billNo: string): Promise<{ success: boolean; message?: string }> {
    const cleanBillNo = String(billNo || '').trim();
    try {
      const q = query(collection(db, INVOICES_COL), where('billNo', '==', cleanBillNo));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: `Invoice #${cleanBillNo} not found.` };
      }

      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      return { success: true };
    } catch (err: any) {
      console.error('Firestore deleteInvoice error:', err);
      return { success: false, message: err.message || 'Failed to delete invoice from Firebase.' };
    }
  },

  async bulkDeleteInvoices(billNos: string[]): Promise<{ success: boolean; count: number; message?: string }> {
    if (!billNos || billNos.length === 0) return { success: true, count: 0 };
    try {
      let totalDeleted = 0;
      const batch = writeBatch(db);

      // Process in chunks if large, but typical bulk delete is 1-50
      for (const billNo of billNos) {
        const q = query(collection(db, INVOICES_COL), where('billNo', '==', String(billNo).trim()));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          batch.delete(d.ref);
          totalDeleted++;
        });
      }

      await batch.commit();
      return { success: true, count: totalDeleted };
    } catch (err: any) {
      console.error('Firestore bulkDelete error:', err);
      return { success: false, count: 0, message: err.message || 'Failed to bulk delete.' };
    }
  },

  // ----------------------------------------------------
  // USER APPROVALS & USER MANAGEMENT
  // ----------------------------------------------------
  async getAllUsers(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getAllUsers error:', err);
      return [];
    }
  },

  async getPendingApprovals(): Promise<any[]> {
    try {
      const q = query(collection(db, 'users'), where('approvalStatus', '==', 'pending'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getPendingApprovals error:', err);
      return [];
    }
  },

  async approveUser(uid: string, role: 'staff' | 'manager' | 'admin', approvedByEmail: string): Promise<{ success: boolean; message?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        approvalStatus: 'approved',
        isApproved: true,
        role,
        approvedAt: new Date().toISOString(),
        approvedBy: approvedByEmail,
      });

      // Also update user_approvals record if exists
      try {
        const appRef = doc(db, 'user_approvals', uid);
        await updateDoc(appRef, {
          status: 'approved',
          role,
          approvedAt: new Date().toISOString(),
          approvedBy: approvedByEmail,
        });
      } catch (e) {
        // ignore if not present
      }

      return { success: true };
    } catch (err: any) {
      console.error('Firestore approveUser error:', err);
      return { success: false, message: err.message || 'Failed to approve user.' };
    }
  },

  async rejectUser(uid: string, reason?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        approvalStatus: 'rejected',
        isApproved: false,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Declined by administrator',
      });

      try {
        const appRef = doc(db, 'user_approvals', uid);
        await updateDoc(appRef, {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
        });
      } catch (e) {
        // ignore
      }

      return { success: true };
    } catch (err: any) {
      console.error('Firestore rejectUser error:', err);
      return { success: false, message: err.message || 'Failed to reject user.' };
    }
  },

  async deleteUserAccount(uid: string): Promise<{ success: boolean; message?: string }> {
    try {
      await deleteDoc(doc(db, 'users', uid));
      try {
        await deleteDoc(doc(db, 'user_approvals', uid));
      } catch (e) {
        // ignore
      }
      return { success: true };
    } catch (err: any) {
      console.error('Firestore deleteUserAccount error:', err);
      return { success: false, message: err.message || 'Failed to delete user.' };
    }
  },

  subscribeUsers(callback: (users: any[]) => void): () => void {
    try {
      const colRef = collection(db, 'users');
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() });
          });
          callback(list);
        },
        (err) => {
          console.error('Users snapshot error:', err);
        }
      );
    } catch (e) {
      console.error('subscribeUsers error:', e);
      return () => {};
    }
  },
};
