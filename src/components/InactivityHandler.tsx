import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 5 minutes of inactivity limit (in milliseconds)
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
// Warning shows 30 seconds before auto logout
const WARNING_THRESHOLD_MS = 30 * 1000;
const STORAGE_KEY = 'va_last_activity_timestamp';
export const INACTIVITY_NOTICE_KEY = 'va_inactivity_logout_notice';

export const InactivityHandler: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  // Record user activity
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore local storage errors
    }

    // Dismiss warning if user resumed interaction
    setShowWarning((prev) => (prev ? false : false));
  }, []);

  // Force sign out due to inactivity
  const handleAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarning(false);

    try {
      sessionStorage.setItem(INACTIVITY_NOTICE_KEY, 'true');
    } catch {
      // ignore
    }

    try {
      await logout();
    } catch (err) {
      console.warn('Error during automatic inactivity sign out:', err);
    }
  }, [logout]);

  useEffect(() => {
    if (!currentUser) return;

    // Initialize timestamps
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore
    }
    isLoggingOutRef.current = false;

    // Interaction events to detect user activity
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'wheel',
      'click',
    ];

    // Throttled event listener to avoid excessive state updates
    let lastThrottledCall = 0;
    const throttledHandler = () => {
      const current = Date.now();
      if (current - lastThrottledCall > 1000) {
        lastThrottledCall = current;
        recordActivity();
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, throttledHandler, { passive: true });
    });

    // Cross-tab synchronization via localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteTimestamp = Number(e.newValue);
        if (!isNaN(remoteTimestamp) && remoteTimestamp > lastActivityRef.current) {
          lastActivityRef.current = remoteTimestamp;
          setShowWarning(false);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Visibility change / tab focus: immediately check if expired while backgrounded
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stored = Number(localStorage.getItem(STORAGE_KEY) || lastActivityRef.current);
        const elapsed = Date.now() - (isNaN(stored) ? lastActivityRef.current : stored);
        if (elapsed >= INACTIVITY_LIMIT_MS) {
          handleAutoLogout();
        } else {
          lastActivityRef.current = stored;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Periodic ticker every 1 second to inspect idle duration
    const intervalTimer = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const stored = Number(localStorage.getItem(STORAGE_KEY) || lastActivityRef.current);
      const effectiveLastActivity = isNaN(stored) ? lastActivityRef.current : Math.max(lastActivityRef.current, stored);
      const elapsed = Date.now() - effectiveLastActivity;
      const timeLeftMs = INACTIVITY_LIMIT_MS - elapsed;

      if (timeLeftMs <= 0) {
        clearInterval(intervalTimer);
        handleAutoLogout();
      } else if (timeLeftMs <= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(timeLeftMs / 1000)));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, throttledHandler);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(intervalTimer);
    };
  }, [currentUser, handleAutoLogout, recordActivity]);

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="inactivity-warning-modal"
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-amber-300 p-5 text-slate-800 space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Inactivity Warning</h3>
            <p className="text-xs text-slate-500">Security Auto Sign-Out</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs text-amber-900">
          <p className="leading-relaxed">
            No activity detected for more than 4 minutes. To protect agency records, your session will automatically sign out in:
          </p>
          <div className="flex items-center justify-center py-1">
            <span className="text-2xl font-black text-amber-700 tracking-wider font-mono">
              00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 text-center">
            Click &quot;Stay Signed In&quot; or tap anywhere to continue your session.
          </p>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <button
            type="button"
            onClick={recordActivity}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In</span>
          </button>
          <button
            type="button"
            onClick={handleAutoLogout}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all flex items-center justify-center space-x-1 cursor-pointer"
            title="Sign Out Now"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
