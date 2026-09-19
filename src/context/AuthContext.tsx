import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase';

export const MASTER_ADMIN_EMAIL = 'snreddy.it@gmail.com';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'manager' | 'staff';
  photoURL?: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  createdAt?: string;
  lastLogin?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  isPendingApproval?: boolean;
  pendingEmail?: string;
  pendingName?: string;
  message?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: AppUserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<AuthResult>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyResetCode: (codeOrLink: string) => Promise<{ success: boolean; email?: string; error?: string }>;
  confirmResetWithCode: (codeOrLink: string, newPass: string) => Promise<AuthResult>;
  resetPasswordWithSecurity: (
    email: string,
    method: 'pin' | 'question',
    verificationValue: string,
    newPass: string
  ) => Promise<AuthResult>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'va_firebase_auth_session';

function cleanFirestoreObject<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim() + '_vijaya_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile from Firestore or create one
  const syncUserProfile = async (user: AuthUser) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as any;
        const isMasterAdmin = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        // Check approval status for non-master admin users
        const isApproved = isMasterAdmin ? true : data.isApproved !== false && data.approvalStatus !== 'pending' && data.approvalStatus !== 'rejected';
        const approvalStatus = isMasterAdmin ? 'approved' : (data.approvalStatus || (isApproved ? 'approved' : 'pending'));

        const profile: AppUserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: data.displayName || user.displayName || 'Authorized User',
          role: isMasterAdmin ? 'admin' : data.role || 'staff',
          photoURL: user.photoURL,
          approvalStatus,
          isApproved,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
        };

        if (!isApproved) {
          // Deny active session if not approved
          localStorage.removeItem(LOCAL_SESSION_KEY);
          setCurrentUser(null);
          setUserProfile(null);
          return;
        }

        setUserProfile(profile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
      } else {
        const isMasterAdmin = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
        const newProfileData: Record<string, any> = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Vijaya Staff',
          role: isMasterAdmin ? 'admin' : 'staff',
          approvalStatus: isMasterAdmin ? 'approved' : 'pending',
          isApproved: isMasterAdmin,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        if (user.photoURL) {
          newProfileData.photoURL = user.photoURL;
        }

        await setDoc(userDocRef, cleanFirestoreObject(newProfileData));

        const newProfile: AppUserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: newProfileData.displayName,
          role: newProfileData.role,
          photoURL: user.photoURL || null,
          approvalStatus: newProfileData.approvalStatus,
          isApproved: isMasterAdmin,
          createdAt: newProfileData.createdAt,
          lastLogin: newProfileData.lastLogin,
        };

        if (!isMasterAdmin) {
          localStorage.removeItem(LOCAL_SESSION_KEY);
          setCurrentUser(null);
          setUserProfile(null);
          return;
        }

        setUserProfile(newProfile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
      }
    } catch (err) {
      console.warn('Could not sync user profile in Firestore:', err);
    }
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Check local cached session first
    try {
      const saved = localStorage.getItem(LOCAL_SESSION_KEY);
      if (saved) {
        const parsed: AppUserProfile = JSON.parse(saved);
        if (parsed && parsed.uid && parsed.email && parsed.isApproved !== false) {
          setCurrentUser({
            uid: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName,
            photoURL: parsed.photoURL,
          });
          setUserProfile(parsed);
        } else {
          localStorage.removeItem(LOCAL_SESSION_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached auth session:', e);
    }

    // 2. Listen to Firebase native auth changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      if (user) {
        const authUser: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        await syncUserProfile(authUser);
      }
      setLoading(false);
    });

    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 800);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // REGISTER USER WITH EMAIL APPROVAL WORKFLOW
  const registerWithEmail = async (email: string, pass: string, name: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }

    try {
      // 1. Check if email already registered in Firestore
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existingData = snap.docs[0].data();
        if (existingData.approvalStatus === 'pending' || !existingData.isApproved) {
          return {
            success: false,
            isPendingApproval: true,
            pendingEmail: cleanEmail,
            error: `An account for ${cleanEmail} is already registered and waiting for approval from the administrator (${MASTER_ADMIN_EMAIL}).`,
          };
        }
        return { success: false, error: 'This email is already registered. Please sign in.' };
      }

      const isMasterAdmin = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
      const passwordHash = await hashPassword(pass);
      const uid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const userDocRef = doc(db, 'users', uid);

      const userDocData: Record<string, any> = {
        uid,
        email: cleanEmail,
        displayName: cleanName,
        role: isMasterAdmin ? 'admin' : 'staff',
        approvalStatus: isMasterAdmin ? 'approved' : 'pending',
        isApproved: isMasterAdmin,
        createdAt: new Date().toISOString(),
        passwordHash,
      };

      if (isMasterAdmin) {
        userDocData.lastLogin = new Date().toISOString();
      }

      // Save user account in Firestore with no undefined fields
      await setDoc(userDocRef, cleanFirestoreObject(userDocData));

      const newProfile: AppUserProfile = {
        uid,
        email: cleanEmail,
        displayName: cleanName,
        role: userDocData.role,
        approvalStatus: userDocData.approvalStatus,
        isApproved: isMasterAdmin,
        createdAt: userDocData.createdAt,
        lastLogin: userDocData.lastLogin || undefined,
      };

      // If master administrator, log them in directly
      if (isMasterAdmin) {
        const authUser: AuthUser = {
          uid,
          email: cleanEmail,
          displayName: cleanName,
        };
        setCurrentUser(authUser);
        setUserProfile(newProfile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
        return { success: true, isPendingApproval: false };
      }

      // Record approval request in user_approvals collection
      try {
        await setDoc(
          doc(db, 'user_approvals', uid),
          cleanFirestoreObject({
            id: uid,
            uid,
            email: cleanEmail,
            displayName: cleanName,
            status: 'pending',
            requestedAt: new Date().toISOString(),
            adminEmail: MASTER_ADMIN_EMAIL,
          })
        );
      } catch (appErr) {
        console.warn('Could not write user_approvals doc:', appErr);
      }

      // Notify administrator via backend API
      try {
        fetch('/api/auth/notify-new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            email: cleanEmail,
            displayName: cleanName,
            requestedAt: new Date().toISOString(),
          }),
        }).catch((e) => console.warn('Email notification fetch error:', e));
      } catch (err) {
        // non-blocking
      }

      // Clean session to ensure user cannot access without approval
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem(LOCAL_SESSION_KEY);

      return {
        success: true,
        isPendingApproval: true,
        pendingEmail: cleanEmail,
        pendingName: cleanName,
        message: `Your registration was submitted successfully. An approval request has been sent to the administrator (${MASTER_ADMIN_EMAIL}). You will be able to log in once approved.`,
      };
    } catch (firestoreErr: any) {
      console.error('Registration error:', firestoreErr);
      return {
        success: false,
        error: 'Registration error: ' + (firestoreErr.message || 'Please try again.'),
      };
    }
  };

  // LOGIN USER WITH APPROVAL VERIFICATION
  const loginWithEmail = async (email: string, pass: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const data = userDoc.data();
        const inputHash = await hashPassword(pass);
        const isMasterAdmin = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();

        // 1. Check Firestore stored passwordHash
        let passwordMatches = !!data.passwordHash && data.passwordHash === inputHash;

        // 2. If passwordHash was missing or didn't match, also test against Firebase Auth
        if (!passwordMatches) {
          try {
            await signInWithEmailAndPassword(auth, cleanEmail, pass);
            // Native Firebase Auth succeeded: sync this passwordHash to Firestore
            await updateDoc(userDoc.ref, { passwordHash: inputHash });
            passwordMatches = true;
          } catch (fbAuthErr) {
            // Check default master admin setup fallback
            if (isMasterAdmin && !data.passwordHash && (pass === 'admin123' || pass === 'Admin123')) {
              await updateDoc(userDoc.ref, { passwordHash: inputHash });
              passwordMatches = true;
            }
          }
        }

        if (!passwordMatches) {
          return {
            success: false,
            error: 'Invalid email or password. If you need to set or reset your password, click "Forgot Password" below.',
          };
        }

        // Check if account is rejected
        if (data.approvalStatus === 'rejected') {
          return {
            success: false,
            error: `Your account registration was declined by the administrator (${MASTER_ADMIN_EMAIL}).`,
          };
        }

        // Check if account is pending approval
        if (!isMasterAdmin && (data.approvalStatus === 'pending' || data.isApproved === false)) {
          return {
            success: false,
            isPendingApproval: true,
            pendingEmail: cleanEmail,
            pendingName: data.displayName || cleanEmail,
            error: `Your account is pending administrator approval. An email notification has been dispatched to ${MASTER_ADMIN_EMAIL}.`,
          };
        }

        // Account is approved!
        const authUser: AuthUser = {
          uid: data.uid || userDoc.id,
          email: data.email,
          displayName: data.displayName || cleanEmail.split('@')[0],
          photoURL: data.photoURL,
        };
        const profile: AppUserProfile = {
          uid: authUser.uid,
          email: data.email,
          displayName: data.displayName || authUser.displayName,
          role: isMasterAdmin ? 'admin' : data.role || 'staff',
          photoURL: data.photoURL,
          approvalStatus: 'approved',
          isApproved: true,
          createdAt: data.createdAt,
          lastLogin: new Date().toISOString(),
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
        };

        await updateDoc(userDoc.ref, { lastLogin: new Date().toISOString() });
        setCurrentUser(authUser);
        setUserProfile(profile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
        return { success: true };
      }

      return {
        success: false,
        error: 'No account registered with this email. Please click "Create Account" to register.',
      };
    } catch (fsErr: any) {
      console.error('Firestore login error:', fsErr);
      return { success: false, error: fsErr.message || 'Login error occurred. Please try again.' };
    }
  };

  // SIGN IN WITH GOOGLE
  const signInWithGoogle = async (): Promise<AuthResult> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      const authUser: AuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
      await syncUserProfile(authUser);
      return { success: true };
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      let errorMsg = err.message || 'Google sign in failed.';
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Popup was blocked by the browser. Please allow popups or open the app in a new tab.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign in was cancelled.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // LOGOUT
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setCurrentUser(null);
    setUserProfile(null);
  };

  // EXTRACT OOB CODE HELPER
  const extractOobCode = (codeOrLink: string): string => {
    const trimmed = (codeOrLink || '').trim();
    // Check if user pasted a full URL
    const urlMatch = trimmed.match(/[?&]oobCode=([^&#\s]+)/);
    if (urlMatch && urlMatch[1]) {
      try {
        return decodeURIComponent(urlMatch[1]);
      } catch {
        return urlMatch[1];
      }
    }
    return trimmed;
  };

  // VERIFY RESET CODE
  const verifyResetCode = async (codeOrLink: string): Promise<{ success: boolean; email?: string; error?: string }> => {
    const oobCode = extractOobCode(codeOrLink);
    if (!oobCode) {
      return { success: false, error: 'Please enter a valid reset code or paste the link from your email.' };
    }
    try {
      const userEmail = await verifyPasswordResetCode(auth, oobCode);
      return { success: true, email: userEmail };
    } catch (err: any) {
      let msg = 'The reset code is invalid or has expired.';
      if (err.code === 'auth/expired-action-code') {
        msg = 'This reset link has expired or timed out. Password reset links are valid for 1 hour. Please request a fresh reset link.';
      } else if (err.code === 'auth/invalid-action-code') {
        msg = 'This reset link is invalid or has already been used. If you requested multiple emails, please make sure you are using the most recent email received.';
      }
      return { success: false, error: msg };
    }
  };

  // CONFIRM RESET PASSWORD WITH CODE (AND SYNC TO FIRESTORE)
  const confirmResetWithCode = async (codeOrLink: string, newPass: string): Promise<AuthResult> => {
    const oobCode = extractOobCode(codeOrLink);
    if (!oobCode) {
      return { success: false, error: 'Please enter a valid reset code or link.' };
    }
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    try {
      // 1. Verify code and obtain the associated email
      const userEmail = await verifyPasswordResetCode(auth, oobCode);

      // 2. Confirm password reset in Firebase Auth
      await confirmPasswordReset(auth, oobCode, newPass);

      // 3. Synchronize passwordHash in Firestore users collection
      const cleanEmail = userEmail.trim().toLowerCase();
      const newHash = await hashPassword(newPass);

      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const d of snap.docs) {
          await updateDoc(d.ref, {
            passwordHash: newHash,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
        const uid = 'usr_' + Date.now().toString(36);
        await setDoc(
          doc(db, 'users', uid),
          cleanFirestoreObject({
            uid,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0],
            role: isMaster ? 'admin' : 'staff',
            approvalStatus: 'approved',
            isApproved: true,
            createdAt: new Date().toISOString(),
            passwordHash: newHash,
          })
        );
      }

      return {
        success: true,
        message: `Password reset successfully for ${cleanEmail}! You can now sign in with your new password.`,
      };
    } catch (err: any) {
      let msg = err.message || 'Failed to reset password.';
      if (err.code === 'auth/expired-action-code') {
        msg = 'This reset link has expired or timed out (Firebase links expire after 1 hour). Please request a fresh reset link.';
      } else if (err.code === 'auth/invalid-action-code') {
        msg = 'This reset link is invalid or already used. If you requested multiple emails, only the newest one is active.';
      }
      return { success: false, error: msg };
    }
  };

  // DIRECT ADMIN RECOVERY PIN / SECURITY QUESTION RESET
  const resetPasswordWithSecurity = async (
    email: string,
    method: 'pin' | 'question',
    verificationValue: string,
    newPass: string
  ): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const cleanVal = (verificationValue || '').trim();
    let verified = false;

    if (method === 'pin') {
      if (cleanVal === '123456') {
        verified = true;
      }
    } else if (method === 'question') {
      if (cleanVal.toUpperCase() === 'VIJAYA AGENCIES') {
        verified = true;
      }
    }

    if (!verified) {
      return {
        success: false,
        error:
          method === 'pin'
            ? 'Invalid 6-digit Master Recovery PIN.'
            : 'Incorrect agency name. Please enter "VIJAYA AGENCIES".',
      };
    }

    try {
      const newHash = await hashPassword(newPass);

      // Update in Firestore
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        for (const d of snap.docs) {
          await updateDoc(d.ref, {
            passwordHash: newHash,
            updatedAt: new Date().toISOString(),
            isApproved: isMaster ? true : undefined,
          });
        }
      } else if (isMaster) {
        const uid = 'usr_' + Date.now().toString(36);
        await setDoc(
          doc(db, 'users', uid),
          cleanFirestoreObject({
            uid,
            email: cleanEmail,
            displayName: 'Master Administrator',
            role: 'admin',
            approvalStatus: 'approved',
            isApproved: true,
            createdAt: new Date().toISOString(),
            passwordHash: newHash,
          })
        );
      } else {
        return { success: false, error: 'No user account found with this email.' };
      }

      // Sync with server DB if available
      try {
        fetch('/api/auth/reset-password/verify-and-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanEmail,
            method: method === 'pin' ? 'recovery_pin' : 'security_question',
            recoveryPin: cleanVal,
            securityAnswer: cleanVal,
            newPassword: newPass,
          }),
        }).catch((e) => console.warn('Server password sync:', e));
      } catch {
        // non-blocking
      }

      return {
        success: true,
        message: `Password updated successfully for ${cleanEmail}! You can now sign in with your new password.`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error updating password.' };
    }
  };

  // SEND PASSWORD RESET EMAIL WITH IN-APP REDIRECT URL
  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // Build actionCodeSettings to direct back to our app
      const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const actionCodeSettings = appOrigin
        ? {
            url: `${appOrigin}/?mode=resetPassword`,
            handleCodeInApp: true,
          }
        : undefined;

      if (actionCodeSettings) {
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      } else {
        await sendPasswordResetEmail(auth, cleanEmail);
      }

      return {
        success: true,
        message:
          'Password reset email sent! Click the link in the email to open the reset page, or copy the link/code and paste it in the "Enter Reset Code" tab below if your browser times out.',
      };
    } catch (err: any) {
      // Try fallback without actionCodeSettings
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return {
          success: true,
          message:
            'Password reset link sent to your email. Check your inbox and spam folder. If clicking the link times out, copy and paste the code/link in the tab below.',
        };
      } catch (fallbackErr: any) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            return {
              success: true,
              message: `Account is registered. If the email link is timing out, use the "Admin Security Recovery" tab below to reset your password instantly with your PIN or agency security answer.`,
            };
          }
        } catch {
          // ignore
        }
        return {
          success: false,
          message: fallbackErr.message || 'Could not send reset email. Please verify the address.',
        };
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithEmail,
        registerWithEmail,
        signInWithGoogle,
        logout,
        sendPasswordReset,
        verifyResetCode,
        confirmResetWithCode,
        resetPasswordWithSecurity,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
