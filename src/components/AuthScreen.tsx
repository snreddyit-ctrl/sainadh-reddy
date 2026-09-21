import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { useAuth, MASTER_ADMIN_EMAIL } from '../context/AuthContext';
import venkateswaraPadmavathiBg from '../assets/images/venkateswara_padmavathi_bg.jpg';

export const AuthScreen: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    resetPasswordWithSecurity,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'approval_pending'>('login');

  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin Security Reset states
  const [securityMethod, setSecurityMethod] = useState<'pin' | 'question'>('pin');
  const [securityValue, setSecurityValue] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Stored details for pending approval confirmation view
  const [pendingDetails, setPendingDetails] = useState<{
    name: string;
    email: string;
    message?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    // 1. SIGN IN
    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Please enter both email and password.');
        return;
      }
      setIsLoading(true);
      try {
        const res = await loginWithEmail(email, password);
        if (!res.success) {
          if (res.isPendingApproval) {
            setPendingDetails({
              name: res.pendingName || email.split('@')[0],
              email: res.pendingEmail || email,
              message: res.error,
            });
            setMode('approval_pending');
          } else {
            setError(res.error || 'Failed to sign in. Please verify your credentials.');
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during sign in.');
      } finally {
        setIsLoading(false);
      }
    }

    // 2. REGISTRATION
    else if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await registerWithEmail(email, password, name);
        if (!res.success) {
          if (res.isPendingApproval) {
            setPendingDetails({
              name: res.pendingName || name,
              email: res.pendingEmail || email,
              message: res.error,
            });
            setMode('approval_pending');
          } else {
            setError(res.error || 'Failed to create account.');
          }
        } else if (res.isPendingApproval) {
          setPendingDetails({
            name: res.pendingName || name,
            email: res.pendingEmail || email,
            message: res.message,
          });
          setMode('approval_pending');
        } else {
          setInfoMessage('Account created and verified! Redirecting to distribution portal...');
        }
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setIsLoading(false);
      }
    }

    // 3. FORGOT PASSWORD (DIRECT ADMIN PIN / SECURITY RESET)
    else if (mode === 'forgot') {
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter your email address.');
        return;
      }
      if (!securityValue.trim()) {
        setError(
          securityMethod === 'pin'
            ? 'Please enter the 6-digit Master Recovery PIN (123456).'
            : 'Please enter the agency name answer (VIJAYA AGENCIES).'
        );
        return;
      }
      if (password.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await resetPasswordWithSecurity(email, securityMethod, securityValue, password);
        if (res.success) {
          setInfoMessage(res.message || 'Password updated successfully! Please sign in with your new password.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSecurityValue('');
        } else {
          setError(res.error || 'Security verification failed.');
        }
      } catch (err: any) {
        setError(err.message || 'Error updating password.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        if (res.isPendingApproval) {
          setPendingDetails({
            name: res.pendingName || 'Google User',
            email: res.pendingEmail || '',
            message: res.error,
          });
          setMode('approval_pending');
        } else {
          setError(res.error || 'Failed to sign in with Google.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAdminEmail = (applicantName: string, applicantEmail: string) => {
    const subject = encodeURIComponent(`Account Approval Request - ${applicantName} (Vijaya Agencies)`);
    const body = encodeURIComponent(
      `Dear Administrator,\n\nI have registered a new account on Vijaya Agencies Distribution Portal and request your approval to access the system:\n\nFull Name: ${applicantName}\nEmail: ${applicantEmail}\nDate: ${new Date().toLocaleString()}\n\nPlease review and approve my account in your Vijaya Agencies Admin Dashboard.\n\nThank you,\n${applicantName}`
    );
    window.open(`mailto:${MASTER_ADMIN_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-slate-100 flex items-center justify-center p-4 py-8 antialiased selection:bg-amber-600 selection:text-white overflow-x-hidden">
      {/* Solid Login Card with Divine Wallpaper on Top and all details below */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden">
        {/* Divine Image Displayed on Top of Sign In */}
        <div className="relative w-full h-56 sm:h-64 bg-black flex items-center justify-center overflow-hidden border-b border-amber-500/20">
          <img
            src={venkateswaraPadmavathiBg}
            alt="Lord Sri Venkateswara Swamy and Goddess Sri Padmavathi Devi"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* All Sign In Details */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Brand Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">VIJAYA AGENCIES</h1>
            <p className="text-xs text-amber-300/90 font-medium">Authorized Distribution & Collection Portal</p>
          </div>

          {/* APPROVAL PENDING CONFIRMATION VIEW */}
          {mode === 'approval_pending' && pendingDetails ? (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-amber-500/40 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-300">Approval Required</h3>
                  <p className="text-xs text-amber-200/80 mt-1">
                    New account created. Awaiting administrator email confirmation.
                  </p>
                </div>

                <div className="text-left bg-zinc-950/80 p-3 rounded-xl border border-zinc-700/60 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Applicant:</span>
                    <span className="font-semibold text-white">{pendingDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-amber-300">{pendingDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Admin Reviewer:</span>
                    <span className="font-mono text-amber-400">{MASTER_ADMIN_EMAIL}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PENDING APPROVAL
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  For security, all new staff and manager accounts must be approved by{' '}
                  <strong className="text-white">{MASTER_ADMIN_EMAIL}</strong> before accessing invoices and collections.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleSendAdminEmail(pendingDetails.name, pendingDetails.email)}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Notify Admin via Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-xs font-medium transition-all flex items-center justify-center gap-2 border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Toggle Tabs (Sign In / Register) */}
              {mode !== 'forgot' && (
                <div className="space-y-3">
                  <div className="flex p-1 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'bg-amber-600 text-white shadow-md font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                        mode === 'register'
                          ? 'bg-amber-600 text-white shadow-md font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    type="button"
                    id="google-signin-btn"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-300 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center pt-1">
                    <div className="border-t border-zinc-700 w-full" />
                    <span className="bg-zinc-900 px-3 text-[11px] text-zinc-400 font-medium uppercase tracking-wider shrink-0">
                      or continue with email
                    </span>
                    <div className="border-t border-zinc-700 w-full" />
                  </div>
                </div>
              )}

              {/* FORGOT PASSWORD HEADER */}
              {mode === 'forgot' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Reset Password
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-zinc-800/90 p-2.5 rounded-lg border border-zinc-700 leading-relaxed">
                    Reset your password securely using the 6-digit Master PIN (<strong>123456</strong>) or the agency name.
                  </div>
                </div>
              )}

              {/* Status Alerts */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="leading-relaxed block">{error}</span>
                  </div>
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{infoMessage}</span>
                </div>
              )}

              {/* Main Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name (Register Mode only) */}
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* SECURITY RECOVERY METHOD (Forgot Mode only) */}
                {mode === 'forgot' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSecurityMethod('pin')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                          securityMethod === 'pin'
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        Master PIN (123456)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecurityMethod('question')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                          securityMethod === 'question'
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        Agency Name
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        {securityMethod === 'pin'
                          ? '6-Digit Master Recovery PIN'
                          : 'Agency Name: What is your distribution agency name?'}
                      </label>
                      <input
                        type="text"
                        required
                        value={securityValue}
                        onChange={(e) => setSecurityValue(e.target.value)}
                        placeholder={securityMethod === 'pin' ? '123456' : 'VIJAYA AGENCIES'}
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* PASSWORD INPUT */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">
                      {mode === 'login' ? 'Password' : 'New Password (min 6 chars)'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                          setInfoMessage(null);
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD INPUT (Register and Forgot modes) */}
                {(mode === 'register' || mode === 'forgot') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === 'login'
                          ? 'Sign In'
                          : mode === 'register'
                          ? 'Submit for Approval'
                          : 'Verify & Reset Password'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to sign in button for forgot password */}
              {mode === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              )}

              {/* Security Badge */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Strict Admin Access Control</span>
                </span>
                <span className="text-[11px] text-amber-300/90 font-medium">
                  Sainadh reddy
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
