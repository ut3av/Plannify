import React, { useState, useEffect } from 'react';

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
  unreadNotificationsCount = 3,
  onSaveCloud,
  isCloudSaving,
  onLoadDemo,
  user,
  onLogout,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
    <header className="h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30 text-slate-100">
      {/* LEFT: Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/80"
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
          onClick={() => onSelectPage && onSelectPage("dashboard")}
          className="flex items-center gap-2.5 shrink-0 pr-2 border-r border-slate-800 text-left cursor-pointer hover:opacity-90 transition-opacity"
        >
          <img
            src="/favicon.png"
            alt="Planify Logo"
            className="w-8 h-8 object-contain drop-shadow-md"
          />
          <span className="font-black text-sm tracking-tight text-white hidden sm:inline-block">
            Planify<span className="text-indigo-400">.exe</span>
          </span>
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 min-w-0 overflow-hidden">
          <span
            onClick={() => onSelectPage && onSelectPage("dashboard")}
            className="hover:text-slate-200 cursor-pointer font-medium"
          >
            Home
          </span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-slate-600">/</span>
              <span className={`truncate ${idx === breadcrumbs.length - 1 ? 'font-bold text-white' : 'hover:text-slate-200 cursor-pointer'}`}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* RIGHT: Search, Cloud Sync, Notifications, Role, Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-400 transition-all hover:text-slate-200"
          title="Global Search (Ctrl+K)"
        >
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden md:inline-block">Search...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Cloud Sync Quick Action */}
        {onSaveCloud && (
          <button
            onClick={onSaveCloud}
            disabled={isCloudSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-all"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-all shadow-sm"
            title="Load complete academic dummy data across all modules"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Load Demo Data</span>
          </button>
        )}

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/80 relative"
          title="Notifications"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Role Switcher Selector */}
        <select
          value={userRole || "Admin"}
          onChange={(e) => onRoleChange && onRoleChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 hidden sm:block"
        >
          <option value="Admin">🛡️ Admin</option>
          <option value="HOD">🎓 HOD View</option>
          <option value="Faculty">👨‍🏫 Faculty View</option>
        </select>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center font-bold text-xs text-indigo-300">
              {user?.email ? user.email[0].toUpperCase() : 'AD'}
            </div>
            <div className="text-left hidden xl:block leading-none pr-1">
              <p className="text-xs font-bold text-slate-200">{user?.email?.split('@')[0] || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{userRole || 'Admin'}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs text-slate-200 animate-fade-in">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="font-bold text-white truncate">{user?.email || 'admin@planify.edu'}</p>
                <p className="text-[10px] text-indigo-400 mt-0.5">Academic OS Admin</p>
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
