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
  theme = 'warm-white',
  onToggleTheme,
  onSwitchUser,
  teachers = [],
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isWarm = theme === 'warm-white';

  return (
    <div className={`min-h-screen font-sans flex flex-col antialiased transition-colors duration-300 ${
      isWarm
        ? 'bg-[#FAF8F3] text-[#1F140E]'
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
        onSaveCloud={onSaveCloud}
        isCloudSaving={isCloudSaving}
        onLoadDemo={onLoadDemo}
        user={user}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSwitchUser={onSwitchUser}
        teachers={teachers}
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
    </div>
  );
}
