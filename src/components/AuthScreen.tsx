import React, { useState, useEffect } from 'react';
import {
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
  Sparkles,
  LogIn,
  UserPlus,
  Zap,
  X,
  HelpCircle,
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
  const [rememberMe, setRememberMe] = useState(true);

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

  // Load remembered email and inactivity notice on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('vijaya_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {
      // ignore
    }

    try {
      const inactivityNotice = sessionStorage.getItem('va_inactivity_logout_notice');
      if (inactivityNotice) {
        sessionStorage.removeItem('va_inactivity_logout_notice');
        setInfoMessage('You were automatically signed out after 5 minutes of inactivity for security.');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleQuickFillAdmin = () => {
    setEmail(MASTER_ADMIN_EMAIL);
    setError(null);
    setInfoMessage('Master Admin email filled. Please enter your password.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    // Save or clear remembered email
    try {
      if (rememberMe && email.trim()) {
        localStorage.setItem('vijaya_remembered_email', email.trim());
      } else {
        localStorage.removeItem('vijaya_remembered_email');
      }
    } catch {
      // ignore
    }

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
    <div className="relative min-h-screen bg-zinc-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 py-8 antialiased selection:bg-amber-600 selection:text-white overflow-x-hidden">
      {/* Subtle warm golden ambient backdrop glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-700/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Solid Login Card with Divine Wallpaper on Top and all details below */}
      <div className="relative z-10 w-full max-w-[440px] bg-zinc-900/95 border border-amber-500/40 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.12)] overflow-hidden transition-all duration-300">
        
        {/* Top Decorative Gold Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Divine Image Displayed prominently on Top of Sign In */}
        <div className="relative w-full h-56 sm:h-64 bg-zinc-950 flex items-center justify-center overflow-hidden border-b-2 border-amber-500/40 group">
          <img
            src={venkateswaraPadmavathiBg}
            alt="Lord Sri Venkateswara Swamy and Goddess Sri Padmavathi Devi"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Sacred Blessing Pill Badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-amber-400/50 flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider text-amber-300">
              || శ్రీ వేంకటేశ్వరాయ నమః ||
            </span>
          </div>

          {/* Smooth bottom transition gradient */}
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-zinc-900 via-zinc-900/70 to-transparent pointer-events-none" />
        </div>

        {/* All Sign In Details & Form Controls */}
        <div className="p-5 sm:p-7 space-y-4">
          
          {/* Brand Header */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="inline-flex items-center gap-2">
              <h1 className="text-2xl sm:text-[26px] font-black tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent drop-shadow-sm">
                VIJAYA AGENCIES
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-amber-300/90 font-medium">
                Authorized FMCG Distribution & Billing Portal
              </span>
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Guntur
              </span>
            </div>
          </div>

          {/* APPROVAL PENDING CONFIRMATION VIEW */}
          {mode === 'approval_pending' && pendingDetails ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-zinc-800/90 border border-amber-500/40 text-center space-y-3 shadow-inner">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-md">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-300">Account Approval Required</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Your registration has been recorded and is pending verification.
                  </p>
                </div>

                <div className="text-left bg-zinc-950/90 p-3 rounded-xl border border-zinc-700/80 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Applicant:</span>
                    <span className="font-semibold text-white">{pendingDetails.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-amber-300">{pendingDetails.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Administrator:</span>
                    <span className="font-mono text-amber-400">{MASTER_ADMIN_EMAIL}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                    <span className="text-slate-400">Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      PENDING ADMIN APPROVAL
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  For security, all accounts must be approved by{' '}
                  <strong className="text-amber-300 font-semibold">{MASTER_ADMIN_EMAIL}</strong> before accessing distribution records.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSendAdminEmail(pendingDetails.name, pendingDetails.email)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-xs font-medium transition-all flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer"
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
                  <div className="grid grid-cols-2 p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'login'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'register'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </button>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    type="button"
                    id="google-signin-btn"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-300 cursor-pointer"
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

                  <div className="relative flex items-center justify-center py-1">
                    <div className="border-t border-zinc-800 w-full" />
                    <span className="bg-zinc-900 px-3 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider shrink-0">
                      or sign in with email
                    </span>
                    <div className="border-t border-zinc-800 w-full" />
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
                        Admin / Staff Password Reset
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 leading-relaxed flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Quickly reset password using the Master PIN (<strong>123456</strong>) or the agency name answer.
                    </span>
                  </div>
                </div>
              )}

              {/* Status Alerts */}
              {error && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed flex-1">{infoMessage}</span>
                  <button
                    type="button"
                    onClick={() => setInfoMessage(null)}
                    className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Main Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name (Register Mode only) */}
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span>Full Name</span>
                      <span className="text-[10px] text-amber-400/90 font-normal">As in ID records</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                      {name && (
                        <button
                          type="button"
                          onClick={() => setName('')}
                          className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Address Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">Email Address</label>
                    {/* User-friendly Quick Fill for Master Admin */}
                    {mode === 'login' && email !== MASTER_ADMIN_EMAIL && (
                      <button
                        type="button"
                        onClick={handleQuickFillAdmin}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
                        title="Click to quickly fill Master Admin email"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Autofill Admin</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => setEmail('')}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* SECURITY RECOVERY METHOD (Forgot Mode only) */}
                {mode === 'forgot' && (
                  <div className="space-y-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityMethod('pin');
                          setSecurityValue('123456');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          securityMethod === 'pin'
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        Master PIN (123456)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityMethod('question');
                          setSecurityValue('VIJAYA AGENCIES');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          securityMethod === 'question'
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        Agency Name
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-200">
                          {securityMethod === 'pin'
                            ? '6-Digit Master Recovery PIN'
                            : 'Distribution Agency Name'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setSecurityValue(securityMethod === 'pin' ? '123456' : 'VIJAYA AGENCIES')}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          Auto-fill Answer
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={securityValue}
                        onChange={(e) => setSecurityValue(e.target.value)}
                        placeholder={securityMethod === 'pin' ? '123456' : 'VIJAYA AGENCIES'}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* PASSWORD INPUT */}
                <div className="space-y-1">
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
                        className="text-xs text-amber-400 hover:text-amber-300 hover:underline cursor-pointer font-medium"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator for register mode */}
                  {password && mode === 'register' && (
                    <div className="space-y-1 pt-1">
                      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            password.length < 6
                              ? 'bg-rose-500 w-1/3'
                              : password.length < 8
                              ? 'bg-amber-500 w-2/3'
                              : 'bg-emerald-500 w-full'
                          } transition-all duration-300`}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400">Password strength:</span>
                        <span
                          className={`font-semibold ${
                            password.length < 6
                              ? 'text-rose-400'
                              : password.length < 8
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {password.length < 6 ? 'Too short (min 6)' : password.length < 8 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* CONFIRM PASSWORD INPUT (Register and Forgot modes) */}
                {(mode === 'register' || mode === 'forgot') && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Remember Me Option (Login mode) */}
                {mode === 'login' && (
                  <div className="flex items-center justify-between pt-1 text-xs text-zinc-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 bg-zinc-950 border-zinc-700 focus:ring-amber-500 focus:ring-offset-zinc-900 cursor-pointer"
                      />
                      <span>Remember email on this device</span>
                    </label>
                  </div>
                )}

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-3 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {mode === 'login'
                          ? 'Sign In to Portal'
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
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              )}

              {/* Security & Access Info Footer */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Secure Admin Approval</span>
                </span>
                <span className="text-[11px] text-amber-300/90 font-medium font-mono">
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
