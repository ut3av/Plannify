import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import NotificationCenter from '../common/NotificationCenter';
import { getLeaveApplications, subscribeToTable } from '../../services/realtimeFacultyService';
import { useAcademic } from '../../context/AcademicContext';

const PAGE_ROUTE_MAP = {
  dashboard: "/dashboard",
  timetable: "/timetable",
  faculty: "/faculty",
  attendance: "/dashboard",
  leave: "/leave",
  substitutions: "/substitutions",
  analytics: "/analytics",
  subjects: "/academic/subjects",
  sections: "/academic/sections",
  rooms: "/academic/rooms",
  slots: "/academic/slots",
  integrations: "/operations/integrations",
  settings: "/operations/settings",
  "public-portal": "/public/timetable",
  reschedule: "/timetable",
  history: "/timetable",
  reports: "/analytics",
};

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
  onOpenQRModal,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onSaveCloud,
  isCloudSaving,
  onResetWorkspace,
  onRemoveDemo,
  user,
  onLogout,
  theme = 'light',
  onToggleTheme,
  teachers = [],
}) {
  const navigate = useNavigate();
  const {
    academicLevel = "ALL",
    setAcademicLevel,
    selectedProgram = "ALL",
    setSelectedProgram,
    selectedSemester = "ALL",
    setSelectedSemester,
  } = useAcademic();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadNotificationsCount);
  const isLight = theme !== 'dark';

  // Live real-time background listener for pending faculty leaves
  const refreshUnreadCount = useCallback(async () => {
    try {
      const leaves = await getLeaveApplications({ status: "pending" });
      setLiveUnreadCount(leaves.length);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();

    const unsubLeave = subscribeToTable("leave_applications", () => {
      refreshUnreadCount();
    });

    const interval = setInterval(refreshUnreadCount, 6000);
    return () => {
      clearInterval(interval);
      unsubLeave();
    };
  }, [refreshUnreadCount]);

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
      isLight
        ? 'bg-white/95 border-slate-200 text-slate-900'
        : 'bg-slate-900/95 border-slate-800 text-slate-100'
    }`}>
      {/* LEFT: Toggle, Brand, & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0 sm:flex-shrink">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-colors border shrink-0 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
          }`}
          title={isSidebarOpen ? "Collapse navigation" : "Expand navigation"}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          className={`flex items-center gap-2 shrink-0 pr-3 border-r text-left cursor-pointer hover:opacity-90 transition-all ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <BrandLogo size="md" isWarm={false} showIcon={true} />
        </button>

        {/* Dynamic Breadcrumbs - clear and readable */}
        <nav className={`hidden sm:flex items-center gap-1.5 text-xs whitespace-nowrap overflow-hidden ${
          isLight ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <span
            onClick={() => {
              if (onSelectPage) onSelectPage("dashboard");
              navigate("/dashboard");
            }}
            className={`cursor-pointer font-medium transition-colors ${
              isLight ? 'hover:text-slate-900' : 'hover:text-slate-200'
            }`}
          >
            Home
          </span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className={`text-[10px] font-bold ${isLight ? 'text-slate-300' : 'text-slate-600'}`}>/</span>
              <span className={`font-semibold transition-colors ${idx === breadcrumbs.length - 1
                ? (isLight ? 'text-slate-900 font-bold' : 'text-white font-bold')
                : (isLight ? 'hover:text-slate-900 cursor-pointer' : 'hover:text-slate-200 cursor-pointer')
              }`}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* CENTER: Institutional Program & Semester Filter Scope Selector */}
      <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs shadow-sm shrink-0">
        {/* Level Toggle: ALL | UG | PG */}
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-800">
          {["ALL", "UG", "PG"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setAcademicLevel && setAcademicLevel(lvl);
                if (lvl === "UG" && selectedProgram === "MCA") {
                  setSelectedProgram && setSelectedProgram("BCA");
                } else if (lvl === "PG" && (selectedProgram === "BCA" || selectedProgram === "B.Tech")) {
                  setSelectedProgram && setSelectedProgram("MCA");
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all ${
                academicLevel === lvl
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={`Filter by ${lvl === 'ALL' ? 'All Degrees' : lvl === 'UG' ? 'Undergraduate (UG)' : 'Postgraduate (PG)'}`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Program Selector */}
        <select
          value={selectedProgram}
          onChange={(e) => {
            const p = e.target.value;
            setSelectedProgram && setSelectedProgram(p);
            if (p === "MCA") setAcademicLevel && setAcademicLevel("PG");
            if (p === "BCA" || p === "B.Tech") setAcademicLevel && setAcademicLevel("UG");
          }}
          className="py-1 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer rounded-xl font-bold outline-none"
          title="Filter by Academic Program"
        >
          <option value="ALL">All Programs</option>
          {(academicLevel === "ALL" || academicLevel === "UG") && (
            <option value="BCA">🎓 BCA (UG)</option>
          )}
          {(academicLevel === "ALL" || academicLevel === "PG") && (
            <option value="MCA">🎓 MCA (PG)</option>
          )}
          {(academicLevel === "ALL" || academicLevel === "UG") && (
            <option value="B.Tech">🎓 B.Tech (UG)</option>
          )}
        </select>

        {/* Semester Selector */}
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester && setSelectedSemester(e.target.value)}
          className="py-1 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer rounded-xl font-bold outline-none"
          title="Filter by Semester"
        >
          <option value="ALL">All Semesters</option>
          <option value="1">Sem 1 (I)</option>
          <option value="2">Sem 2 (II)</option>
          <option value="3">Sem 3 (III)</option>
          <option value="4">Sem 4 (IV)</option>
          {selectedProgram !== "MCA" && (
            <>
              <option value="5">Sem 5 (V)</option>
              <option value="6">Sem 6 (VI)</option>
            </>
          )}
          {selectedProgram === "B.Tech" && (
            <>
              <option value="7">Sem 7 (VII)</option>
              <option value="8">Sem 8 (VIII)</option>
            </>
          )}
        </select>
      </div>

      {/* RIGHT: Theme Toggle, Search, Actions, Notifications, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-sm'
                : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-amber-400 hover:text-amber-300'
            }`}
            title={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
          >
            {isLight ? (
              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <span className="hidden xl:inline-block text-[11px]">{isLight ? 'Dark' : 'Light'}</span>
          </button>
        )}

        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Global Search (Ctrl+K)"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden xl:inline-block text-[11px]">Search</span>
          <kbd className={`hidden 2xl:inline-block px-1 py-0.2 rounded border text-[9px] font-mono ${
            isLight
              ? 'bg-white border-slate-200 text-slate-500'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}>
            Ctrl+K
          </kbd>
        </button>

        {/* Student Branch QR Code Quick Action */}
        {onOpenQRModal && (
          <button
            onClick={onOpenQRModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
            }`}
            title="Generate student branch timetable QR codes"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="hidden md:inline text-[11px]">QR Code</span>
          </button>
        )}

        {/* Cloud Sync Quick Action */}
        {onSaveCloud && (
          <button
            onClick={onSaveCloud}
            disabled={isCloudSaving}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isLight
                ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
            }`}
            title="Save draft to Supabase Cloud"
          >
            <svg className={`w-3.5 h-3.5 shrink-0 ${isCloudSaving ? 'animate-spin text-indigo-600' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span className="hidden lg:inline text-[11px]">{isCloudSaving ? "Saving..." : "Save"}</span>
          </button>
        )}

        {/* Reset Workspace Action */}
        {(onResetWorkspace || onRemoveDemo) && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to reset your workspace? This will clear active draft entries.")) {
                (onResetWorkspace || onRemoveDemo)();
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Clear current workspace and start with a clean configuration"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span className="hidden lg:inline text-[11px]">Reset</span>
          </button>
        )}

        {/* Notifications Bell */}
        <button
          onClick={() => setShowNotificationCenter(true)}
          className={`p-2 rounded-xl transition-colors border relative shrink-0 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
          }`}
          title="Real-Time Notifications"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {liveUnreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-white font-bold text-[9px] flex items-center justify-center animate-pulse shadow-sm ${
              isLight ? 'bg-indigo-600' : 'bg-indigo-500'
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
              const target = targetTab.startsWith('/') ? targetTab : (PAGE_ROUTE_MAP[targetTab] || `/${targetTab}`);
              navigate(target);
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
              isLight
                ? 'hover:bg-slate-100 hover:border-slate-200'
                : 'hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs ${
              isLight
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-indigo-600/30 border-indigo-400/40 text-indigo-300'
            }`}>
              {user?.email ? user.email[0].toUpperCase() : 'AD'}
            </div>
            <div className="text-left hidden xl:block leading-none pr-1">
              <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {user?.email?.split('@')[0] || 'Administrator'}
              </p>
              <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {userRole || 'Admin'}
              </p>
            </div>
          </button>

          {showProfileMenu && (
            <div className={`absolute right-0 mt-2 w-52 rounded-2xl border shadow-2xl p-2 z-50 text-xs animate-fade-in ${
              isLight
                ? 'bg-white border-slate-200 text-slate-800 shadow-slate-200/80'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}>
              <div className={`px-3 py-2 border-b ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                <p className={`font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {user?.email || 'admin@lnctu.ac.in'}
                </p>
                <p className={`text-[10px] mt-0.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                  Academic Dean / Admin
                </p>
              </div>

              {onRoleChange && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onRoleChange("teacher");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors mt-1 ${
                    isLight
                      ? "hover:bg-indigo-50 text-indigo-700"
                      : "hover:bg-indigo-500/20 text-indigo-300"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Switch to Teacher Portal</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onLogout) onLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 dark:hover:bg-red-500/20 dark:text-red-400 flex items-center gap-2 mt-1 font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
