import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 5 minutes of inactivity limit (in milliseconds)
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
// Warning shows 30 seconds before auto logout (at 4m 30s)
const WARNING_THRESHOLD_MS = 30 * 1000;
const STORAGE_KEY = 'va_last_activity_timestamp';
export const INACTIVITY_NOTICE_KEY = 'va_inactivity_logout_notice';

export const InactivityHandler: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  // Force sign out due to inactivity
  const handleAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarning(false);

    try {
      sessionStorage.setItem(INACTIVITY_NOTICE_KEY, 'true');
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    try {
      await logoutRef.current();
    } catch (err) {
      console.warn('Error during automatic inactivity sign out:', err);
    }
  }, []);

  // Explicit user confirmation to stay signed in
  const handleStaySignedIn = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      sessionStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore
    }
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setShowWarning(false);
      return;
    }

    isLoggingOutRef.current = false;

    // Check if there is an existing activity timestamp from this session
    let initialTimestamp = Date.now();
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > 0) {
          const elapsed = Date.now() - parsed;
          if (elapsed >= INACTIVITY_LIMIT_MS) {
            // Already expired before mount
            handleAutoLogout();
            return;
          }
          initialTimestamp = parsed;
        }
      } else {
        sessionStorage.setItem(STORAGE_KEY, String(initialTimestamp));
      }
    } catch {
      // ignore
    }

    lastActivityRef.current = initialTimestamp;

    // Interaction handler with expiration guard
    let lastThrottledCall = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle to at most once per 500ms
      if (now - lastThrottledCall < 500) return;
      lastThrottledCall = now;

      // CRITICAL: Check if already expired before recording new activity!
      // This prevents someone who has been away for > 5 min from resetting the timer by moving the mouse.
      let last = lastActivityRef.current;
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed)) last = parsed;
        }
      } catch {
        // ignore
      }

      const elapsed = now - last;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        // Inactive for 5+ minutes: trigger sign-out immediately without resetting timestamp
        handleAutoLogout();
        return;
      }

      // Valid activity within the 5-minute window: update timestamp
      lastActivityRef.current = now;
      try {
        sessionStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // ignore
      }

      // If warning was active and user interacted, dismiss warning
      setShowWarning(false);
    };

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

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserInteraction, { passive: true });
    });

    // Visibility change and focus: verify expiration immediately when user re-focuses tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        const now = Date.now();
        let last = lastActivityRef.current;
        try {
          const stored = sessionStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = Number(stored);
            if (!isNaN(parsed)) last = parsed;
          }
        } catch {
          // ignore
        }

        const elapsed = now - last;
        if (elapsed >= INACTIVITY_LIMIT_MS) {
          handleAutoLogout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Periodic ticker every 1 second to inspect idle duration
    const intervalTimer = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const now = Date.now();
      let last = lastActivityRef.current;
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed)) last = parsed;
        }
      } catch {
        // ignore
      }

      const elapsed = now - last;
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
        window.removeEventListener(eventName, handleUserInteraction);
      });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(intervalTimer);
    };
  }, [currentUser, handleAutoLogout]);

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
            onClick={handleStaySignedIn}
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
