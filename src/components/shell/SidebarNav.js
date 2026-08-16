import React from 'react';

const NAV_GROUPS = [
  {
    title: "MAIN",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "home", badge: null },
      { id: "timetable", label: "Timetable Workspace", icon: "grid", badge: "Primary" },
      { id: "faculty", label: "Faculty Directory", icon: "users", badge: null },
      { id: "attendance", label: "Attendance", icon: "clock", badge: null },
      { id: "leave", label: "Leave Management", icon: "calendar", badge: null },
      { id: "substitutions", label: "Substitutions", icon: "user-check", badge: null },
      { id: "analytics", label: "Analytics 360°", icon: "bar-chart", badge: "ERP" },
    ],
  },
  {
    title: "ACADEMIC SETUP",
    items: [
      { id: "subjects", label: "Subjects", icon: "book-open", badge: null },
      { id: "sections", label: "Sections / Classes", icon: "layers", badge: null },
      { id: "rooms", label: "Classrooms & Labs", icon: "building", badge: null },
      { id: "slots", label: "Time Slots", icon: "timer", badge: null },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { id: "reschedule", label: "Reschedule Engine", icon: "refresh-cw", badge: null },
      { id: "history", label: "History & Audit Logs", icon: "history", badge: null },
      { id: "integrations", label: "Automation & Make", icon: "zap", badge: null },
      { id: "logs", label: "System Logs", icon: "terminal", badge: null },
    ],
  }, {
    title: "REPORTS",
    items: [
      { id: "reports", label: "Reports Center", icon: "file-text", badge: "Excel" },
    ],
  },
];

function NavIcon({ icon, className = "w-4 h-4" }) {
  const icons = {
    home: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    grid: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    users: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    clock: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    calendar: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    "user-check": <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>,
    "bar-chart": <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    "building-2": <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18Z" /><path d="M6 12H4a2 2 0 00-2 2v8h4" /><path d="M18 9h2a2 2 0 012 2v11h-4" /></svg>,
    "book-open": <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>,
    layers: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polygon points="2 17 12 22 22 17" /><polygon points="2 12 12 17 22 12" /></svg>,
    building: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /></svg>,
    timer: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="14" x2="15" y2="11" /><circle cx="12" cy="14" r="8" /></svg>,
    "refresh-cw": <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>,
    history: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>,
    zap: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    terminal: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
    "file-text": <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    settings: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
  };
  return icons[icon] || <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg>;
}

export default function SidebarNav({
  isOpen,
  activePage,
  onSelectPage,
  userRole = "Admin",
  theme = "dark",
}) {
  const isWarm = theme === 'warm-white';

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 z-20 backdrop-blur-md border-r transition-all duration-300 flex flex-col ${
        isOpen ? "w-64" : "w-16"
      } ${
        isWarm
          ? 'border-[#3d2a1e]'
          : 'bg-slate-900/95 border-slate-800'
      }`}
      style={isWarm ? { backgroundColor: 'rgba(44, 24, 16, 0.98)' } : undefined}
    >
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {NAV_GROUPS.map((group, groupIdx) => {
          const isFaculty = userRole === "Faculty" || userRole === "Teacher" || userRole === "teacher";
          if (isFaculty && group.title === "ACADEMIC SETUP") {
            return null;
          }

          // Filter out Leave Apply / Substitutions for Admin role (restricted to Teacher interface)
          const filteredItems = group.items.filter(item => {
            if (!isFaculty && (item.id === "leave" || item.id === "substitutions")) {
              return false;
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={groupIdx} className="space-y-1">
              {isOpen ? (
                <p className={`px-3 text-[10px] font-black uppercase tracking-widest mb-2 ${
                  isWarm ? 'text-amber-700/50' : 'text-slate-500'
                }`}>
                  {group.title}
                </p>
              ) : (
                <div className={`w-full h-px my-2 ${
                  isWarm ? 'bg-[#3d2a1e]' : 'bg-slate-800'
                }`} />
              )}

              {filteredItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectPage(item.id)}
                    title={!isOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group ${
                      isActive
                        ? isWarm
                          ? 'bg-amber-600/20 text-amber-100 border border-amber-500/40 shadow-lg shadow-amber-500/10 font-bold'
                          : 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/10 font-bold'
                        : isWarm
                          ? 'text-amber-200/60 hover:text-amber-100 hover:bg-amber-900/30 border border-transparent'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className={`${
                      isActive
                        ? isWarm ? 'text-amber-400' : 'text-indigo-400'
                        : isWarm
                          ? 'text-amber-200/60 group-hover:text-amber-100'
                          : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <NavIcon icon={item.icon} />
                    </div>

                    {isOpen && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {isOpen && item.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        isWarm
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip on collapsed hover */}
                    {!isOpen && (
                      <div className={`absolute left-full ml-2 hidden group-hover:block z-50 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap shadow-xl border ${
                        isWarm
                          ? 'bg-[#2c1810] border-[#3d2a1e]'
                          : 'bg-slate-950 border-slate-700'
                      }`}>
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      {isOpen && (
        <div className={`p-3 border-t text-[10px] flex items-center justify-between ${
          isWarm
            ? 'border-[#3d2a1e] text-amber-200/40'
            : 'border-slate-800 text-slate-500'
        }`}>
          <span>Planify Enterprise</span>
          <span className={`font-mono ${isWarm ? 'text-amber-400' : 'text-emerald-400'}`}>v1.0.0</span>
        </div>
      )}
    </aside>
  );
}
