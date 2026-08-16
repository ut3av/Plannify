import React, { useState } from 'react';
import HeaderBar from './HeaderBar';
import SidebarNav from './SidebarNav';
import CommandPaletteModal from './CommandPaletteModal';

export default function AppShell({
  activePage,
  onSelectPage,
  pageTitle,
  breadcrumbs = [],
  userRole,
  onRoleChange,
  onSaveCloud,
  isCloudSaving,
  onLoadDemo,
  user,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const isWarm = theme === 'warm-white';

  const notifications = [
    { id: 1, title: "Leave Application Received", text: "Dr. Arvind Kumar requested 2 days Casual Leave.", time: "10 mins ago", type: "leave" },
    { id: 2, title: "Substitution Needed", text: "Slot 3 proxy required for BCA-II CS102.", time: "25 mins ago", type: "substitution" },
    { id: 3, title: "Timetable Solved", text: "Draft generated with score 0 (Optimal).", time: "1 hour ago", type: "timetable" },
  ];

  return (
    <div className={`min-h-screen font-sans flex flex-col antialiased transition-colors duration-300 ${
      isWarm
        ? 'bg-[#faf7f2] text-[#2c1810]'
        : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Header Bar */}
      <HeaderBar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activePage={activePage}
        onSelectPage={onSelectPage}
        pageTitle={pageTitle}
        breadcrumbs={breadcrumbs}
        userRole={userRole}
        onRoleChange={onRoleChange}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setShowNotificationDrawer(!showNotificationDrawer)}
        unreadNotificationsCount={notifications.length}
        onSaveCloud={onSaveCloud}
        isCloudSaving={isCloudSaving}
        onLoadDemo={onLoadDemo}
        user={user}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <div className="flex flex-1 relative">
        {/* Left Sidebar Drawer */}
        <SidebarNav
          isOpen={isSidebarOpen}
          activePage={activePage}
          onSelectPage={onSelectPage}
          userRole={userRole}
          theme={theme}
        />

        {/* Main Content Workspace */}
        <main
          className={`flex-1 transition-all duration-300 p-6 overflow-y-auto ${
            isSidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(page, id) => {
          onSelectPage(page, id);
          setIsSearchOpen(false);
        }}
      />

      {/* Notification Drawer */}
      {showNotificationDrawer && (
        <div className={`fixed right-4 top-20 w-80 rounded-2xl border shadow-2xl p-4 z-50 text-xs animate-fade-in ${
          isWarm
            ? 'bg-[#fffdf8] border-[#e8ddd0] text-[#2c1810]'
            : 'bg-slate-900 border-slate-700 text-slate-200'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
            isWarm ? 'border-[#e8ddd0]' : 'border-slate-800'
          }`}>
            <h3 className={`font-bold text-sm ${isWarm ? 'text-[#2c1810]' : 'text-white'}`}>Notifications</h3>
            <button onClick={() => setShowNotificationDrawer(false)} className={`font-bold text-xs ${
              isWarm ? 'text-[#a08b7a] hover:text-[#2c1810]' : 'text-slate-400 hover:text-white'
            }`}>✕</button>
          </div>
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded-xl border space-y-1 ${
                isWarm
                  ? 'bg-[#f3ede4] border-[#e8ddd0]'
                  : 'bg-slate-800/80 border-slate-700/60'
              }`}>
                <div className="flex justify-between items-start font-semibold">
                  <span className={isWarm ? 'text-[#2c1810]' : 'text-white'}>{n.title}</span>
                  <span className={`text-[10px] font-normal ${isWarm ? 'text-[#a08b7a]' : 'text-slate-400'}`}>{n.time}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isWarm ? 'text-[#6b5344]' : 'text-slate-300'}`}>{n.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
