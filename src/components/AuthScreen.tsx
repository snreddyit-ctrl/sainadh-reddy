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

export const AuthScreen: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    resetPasswordWithSecurity,
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

  const handleSendAdminEmail = (applicantName: string, applicantEmail: string) => {
    const subject = encodeURIComponent(`Account Approval Request - ${applicantName} (Vijaya Agencies)`);
    const body = encodeURIComponent(
      `Dear Administrator,\n\nI have registered a new account on Vijaya Agencies Distribution Portal and request your approval to access the system:\n\nFull Name: ${applicantName}\nEmail: ${applicantEmail}\nDate: ${new Date().toLocaleString()}\n\nPlease review and approve my account in your Vijaya Agencies Admin Dashboard.\n\nThank you,\n${applicantName}`
    );
    window.open(`mailto:${MASTER_ADMIN_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 antialiased selection:bg-blue-600 selection:text-white">
      {/* Background subtle ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-800/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 text-white mb-1">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">VIJAYA AGENCIES</h1>
          <p className="text-xs text-slate-400">Authorized Distribution & Collection Portal</p>
        </div>

        {/* APPROVAL PENDING CONFIRMATION VIEW */}
        {mode === 'approval_pending' && pendingDetails ? (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-300">Approval Required</h3>
                <p className="text-xs text-amber-200/80 mt-1">
                  New account created. Awaiting administrator email confirmation.
                </p>
              </div>

              <div className="text-left bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Applicant:</span>
                  <span className="font-semibold text-white">{pendingDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-blue-300">{pendingDetails.email}</span>
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

              <p className="text-[11px] text-slate-400 leading-relaxed">
                For security, all new staff and manager accounts must be approved by{' '}
                <strong className="text-slate-300">{MASTER_ADMIN_EMAIL}</strong> before accessing invoices and collections.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSendAdminEmail(pendingDetails.name, pendingDetails.email)}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
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
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all flex items-center justify-center gap-2"
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
              <div className="flex p-1 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === 'login'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
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
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === 'register'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* FORGOT PASSWORD HEADER */}
            {mode === 'forgot' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
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
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50 leading-relaxed">
                  Reset your password securely using the 6-digit Master PIN (<strong>123456</strong>) or the agency name.
                </div>
              </div>
            )}

            {/* Status Alerts */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="leading-relaxed block">{error}</span>
                </div>
              </div>
            )}

            {infoMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{infoMessage}</span>
              </div>
            )}

            {/* Main Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Register Mode only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="snreddy.it@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Master PIN (123456)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecurityMethod('question')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        securityMethod === 'question'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Agency Name
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
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
                      className="w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              {/* PASSWORD INPUT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
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
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
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
            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strict Admin Access Control</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {MASTER_ADMIN_EMAIL}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
