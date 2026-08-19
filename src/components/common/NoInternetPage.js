import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAcademic } from '../../context/AcademicContext';

export default function NoInternetPage({ onDismissOffline }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [checkMessage, setCheckMessage] = useState(null);
  const [checkSuccess, setCheckSuccess] = useState(false);

  let theme = 'light';
  let toggleTheme = () => {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const academic = useAcademic();
    if (academic) {
      theme = academic.theme || 'light';
      toggleTheme = academic.toggleTheme || (() => {});
    }
  } catch {
    // Fallback if standalone
  }

  const isDark = theme === 'dark';

  // Manual Ping Check
  const testConnection = useCallback(async () => {
    setIsChecking(true);
    setCheckMessage("Testing network socket and connectivity...");
    
    try {
      // Attempt cache-busted fetch to test real connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(`/favicon.png?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status === 200 || response.type === 'opaque') {
        setIsOnline(true);
        setCheckSuccess(true);
        setCheckMessage("Connection Restored! Reconnected to network.");
        setTimeout(() => {
          if (onDismissOffline) {
            onDismissOffline();
          } else {
            navigate("/dashboard");
          }
        }, 1500);
      } else {
        throw new Error("Unable to reach host");
      }
    } catch {
      setIsOnline(navigator.onLine);
      setCheckSuccess(false);
      setCheckMessage("Still offline. Please check your Wi-Fi, Ethernet, or proxy settings.");
    } finally {
      setIsChecking(false);
    }
  }, [navigate, onDismissOffline]);

  // Listen to browser network state changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setCheckSuccess(true);
      setCheckMessage("Internet connection detected! Auto-reconnecting...");
      setTimeout(() => {
        if (onDismissOffline) {
          onDismissOffline();
        } else {
          navigate("/dashboard");
        }
      }, 1200);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setCheckSuccess(false);
      setCheckMessage("Network disconnected.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate, onDismissOffline]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[500px] bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-amber-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-[500px] h-[500px] bg-indigo-600/5 dark:bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* TOP FULL-WIDTH NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <BrandLogo size="md" isWarm={false} />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => {
                if (onDismissOffline) onDismissOffline();
                else navigate("/dashboard");
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
            >
              Offline Cache Mode →
            </button>
          </div>
        </div>
      </header>

      {/* MAIN FULL-PAGE OFFLINE HERO */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center items-center text-center relative z-10">
        
        {/* Animated Wi-Fi Disconnected Radar Visual */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-2xl relative">
            <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" stroke="currentColor" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" strokeLinecap="round" />
            </svg>

            {/* Pulsing indicator badge */}
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold tracking-wide mb-3 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Network Connection Lost</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
          You're Currently Offline
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-3 leading-relaxed font-normal">
          Plannify couldn't reach the academic cloud server. Real-time Supabase timetable synchronizations and live faculty leave broadcasts are temporarily paused.
        </p>

        {/* Live Test Feedback Banner */}
        {checkMessage && (
          <div className={`mt-5 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 max-w-md animate-fade-in ${
            checkSuccess
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${checkSuccess ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span>{checkMessage}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-6">
          <button
            onClick={testConnection}
            disabled={isChecking}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
          >
            {isChecking ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Diagnosing Network...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>Retry Connection</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (onDismissOffline) onDismissOffline();
              else navigate("/timetable");
            }}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>View Cached Timetable Grid</span>
          </button>
        </div>

        {/* DIAGNOSTIC CHECKLIST */}
        <div className="w-full mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Diagnostic Status Matrix
            </span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Reconnect Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Wi-Fi / Ethernet</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOnline ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                }`}>
                  {isOnline ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Check local wireless router or network cables.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Supabase Cloud</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                  Standby
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unsynced edits will resume automatically on reconnection.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Client Solver</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  Ready (Local)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Client heuristic engine can continue building draft slots.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* FULL-WIDTH FOOTER */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white font-brand">Plannify<span className="text-purple-600 dark:text-purple-400">.exe</span></span>
            <span>· Offline Diagnostics 2026</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={testConnection} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer">
              Ping Network
            </button>
            <Link to="/dashboard" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
