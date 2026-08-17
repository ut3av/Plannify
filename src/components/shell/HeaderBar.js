import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import NotificationCenter from '../common/NotificationCenter';

export default function HeaderBar({
  isSidebarOpen,
  onToggleSidebar,
  activePage,
  onSelectPage,
  pageTitle,
  breadcrumbs = [],
  userRole,
  onRoleChange,
  onOpenSearch,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onSaveCloud,
  isCloudSaving,
  onLoadDemo,
  onRemoveDemo,
  user,
  onLogout,
  theme = 'warm-white',
  onToggleTheme,
  teachers = [],
}) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadNotificationsCount);
  const isWarm = theme === 'warm-white';

  // Keyboard shortcut Ctrl+K / Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  return (
    <header className={`h-16 backdrop-blur-md border-b px-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300 ${
      isWarm
        ? 'bg-white/95 border-[#E8DDD0] text-[#1F140E]'
        : 'bg-slate-900/95 border-slate-800 text-slate-100'
    }`}>
      {/* LEFT: Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-colors border ${
            isWarm
              ? 'bg-[#F4EEE5] hover:bg-[#E8DDD0] text-[#5C4A3E] border-[#E8DDD0]'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
          }`}
          title={isSidebarOpen ? "Collapse navigation" : "Expand navigation"}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand logo in header */}
        <button
          onClick={() => {
            if (onSelectPage) onSelectPage("dashboard");
            navigate("/dashboard");
          }}
          className={`flex items-center gap-2.5 shrink-0 pr-3 border-r text-left cursor-pointer hover:opacity-90 transition-all group ${
            isWarm ? 'border-[#E8DDD0]' : 'border-slate-800'
          }`}
        >
          <img
            src="/favicon.png"
            alt="Plannify Logo"
            className={`w-8 h-8 object-contain ${
              isWarm ? 'drop-shadow-[0_2px_10px_rgba(217,119,6,0.35)]' : 'drop-shadow-[0_2px_10px_rgba(126,34,206,0.35)]'
            } group-hover:scale-105 transition-transform`}
          />
          <BrandLogo size="md" isWarm={isWarm} className="hidden sm:inline-flex" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className={`flex items-center gap-2 text-xs min-w-0 overflow-hidden ${
          isWarm ? 'text-[#8F7B6D]' : 'text-slate-400'
        }`}>
          <span
            onClick={() => {
              if (onSelectPage) onSelectPage("dashboard");
              navigate("/dashboard");
            }}
            className={`cursor-pointer font-medium ${
              isWarm ? 'hover:text-[#1F140E]' : 'hover:text-slate-200'
            }`}
          >
            Home
          </span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className={isWarm ? 'text-[#D4C4B0]' : 'text-slate-600'}>/</span>
              <span className={`truncate ${idx === breadcrumbs.length - 1
                ? `font-bold ${isWarm ? 'text-[#1F140E]' : 'text-white'}`
                : `${isWarm ? 'hover:text-[#1F140E]' : 'hover:text-slate-200'} cursor-pointer`
              }`}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* RIGHT: Theme Toggle, Search, Cloud Sync, Notifications, Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
              isWarm
                ? 'bg-amber-100 hover:bg-amber-200 border-amber-300/80 text-amber-900 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-slate-100'
            }`}
            title={isWarm ? 'Switch to Dark theme' : 'Switch to Warm White theme'}
          >
            {isWarm ? (
              /* Moon icon for switching to dark */
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              /* Sun icon for switching to warm white */
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            )}
            <span className="hidden md:inline-block">{isWarm ? 'Dark' : 'Warm'}</span>
          </button>
        )}

        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
            isWarm
              ? 'bg-[#f3ede4]/80 hover:bg-[#e8ddd0] border-[#e8ddd0] text-[#a08b7a] hover:text-[#6b5344]'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
          title="Global Search (Ctrl+K)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden md:inline-block">Search...</span>
          <kbd className={`hidden md:inline-block px-1.5 py-0.5 rounded border text-[10px] font-mono ${
            isWarm
              ? 'bg-[#f3ede4] border-[#e8ddd0] text-[#a08b7a]'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}>
            Ctrl+K
          </kbd>
        </button>

        {/* Cloud Sync Quick Action */}
        {onSaveCloud && (
          <button
            onClick={onSaveCloud}
            disabled={isCloudSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isWarm
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300/50 text-amber-700'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
            }`}
            title="Save draft to Supabase Cloud"
          >
            <svg className={`w-3.5 h-3.5 ${isCloudSaving ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span className="hidden lg:inline">{isCloudSaving ? "Saving..." : "Save Cloud"}</span>
          </button>
        )}

        {/* Load Demo Data Quick Action */}
        {onLoadDemo && (
          <button
            onClick={onLoadDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isWarm
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300/60 text-emerald-700'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            }`}
            title="Load complete academic demo data across all modules"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Load Demo Data</span>
          </button>
        )}

        {/* Remove Demo Data / Clear Workspace Action */}
        {onRemoveDemo && (
          <button
            onClick={onRemoveDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isWarm
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300/60 text-rose-700'
                : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
            }`}
            title="Remove demo data and switch to clean real implementation workspace"
          >
            <span>🗑️</span>
            <span className="hidden sm:inline">Remove Demo Data</span>
          </button>
        )}

        {/* Notifications Bell */}
        <button
          onClick={() => setShowNotificationCenter(true)}
          className={`p-2 rounded-xl transition-colors border relative ${
            isWarm
              ? 'bg-[#f3ede4] hover:bg-[#e8ddd0] text-[#6b5344] border-[#e8ddd0]'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
          }`}
          title="Real-Time Notifications"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {liveUnreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-white font-bold text-[9px] flex items-center justify-center animate-pulse shadow-sm ${
              isWarm ? 'bg-amber-600' : 'bg-indigo-500'
            }`}>
              {liveUnreadCount}
            </span>
          )}
        </button>

        {/* Live Real-Time Notification Center */}
        {showNotificationCenter && (
          <NotificationCenter
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
            onNavigate={(targetTab) => {
              if (onSelectPage) onSelectPage(targetTab);
            }}
            onUpdateUnreadCount={(count) => setLiveUnreadCount(count)}
          />
        )}

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-2 p-1 rounded-xl transition-colors border border-transparent ${
              isWarm
                ? 'hover:bg-[#f3ede4] hover:border-[#e8ddd0]'
                : 'hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs ${
              isWarm
                ? 'bg-amber-100 border-amber-300/60 text-amber-800'
                : 'bg-indigo-600/30 border-indigo-400/40 text-indigo-300'
            }`}>
              {user?.email ? user.email[0].toUpperCase() : 'AD'}
            </div>
            <div className="text-left hidden xl:block leading-none pr-1">
              <p className={`text-xs font-bold ${isWarm ? 'text-[#2c1810]' : 'text-slate-200'}`}>
                {user?.email?.split('@')[0] || 'Administrator'}
              </p>
              <p className={`text-[10px] mt-0.5 ${isWarm ? 'text-[#a08b7a]' : 'text-slate-400'}`}>
                {userRole || 'Admin'}
              </p>
            </div>
          </button>

          {showProfileMenu && (
            <div className={`absolute right-0 mt-2 w-52 rounded-2xl border shadow-2xl p-2 z-50 text-xs animate-fade-in ${
              isWarm
                ? 'bg-[#fffdf8] border-[#e8ddd0] text-[#2c1810]'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}>
              <div className={`px-3 py-2 border-b ${isWarm ? 'border-[#e8ddd0]' : 'border-slate-800'}`}>
                <p className={`font-bold truncate ${isWarm ? 'text-[#2c1810]' : 'text-white'}`}>
                  {user?.email || 'admin@lnctu.ac.in'}
                </p>
                <p className={`text-[10px] mt-0.5 ${isWarm ? 'text-amber-600' : 'text-indigo-400'}`}>
                  Academic Dean / Admin
                </p>
              </div>



              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onLogout) onLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 flex items-center gap-2 mt-1 font-semibold transition-colors"
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
