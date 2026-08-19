import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function NetworkStatusWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
      setShowRestoredToast(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestoredToast(true);
      const timer = setTimeout(() => {
        setShowRestoredToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Do not show the top banner if already on the full /offline page
  if (location.pathname === '/offline') {
    return null;
  }

  return (
    <>
      {/* Offline Alert Strip */}
      {isOffline && !isDismissed && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white text-xs font-bold py-2.5 px-4 sticky top-0 z-[100] shadow-md flex items-center justify-between gap-3 animate-slide-down">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
            <span className="truncate">
              <strong>Offline Mode:</strong> Internet connection lost. Live Supabase sync is paused; local cache is active.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/offline')}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              Diagnostics →
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer"
              title="Dismiss warning banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connection Restored Toast */}
      {showRestoredToast && (
        <div className="fixed bottom-5 right-5 z-[100] bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-emerald-400/40 animate-slide-down">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span>Connection restored! Synchronizing academic datasets...</span>
        </div>
      )}
    </>
  );
}
