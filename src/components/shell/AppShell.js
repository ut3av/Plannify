import React, { useState } from 'react';
import HeaderBar from './HeaderBar';
import SidebarNav from './SidebarNav';
import CommandPaletteModal from './CommandPaletteModal';
import ShareTimetableModal from '../common/ShareTimetableModal';

export default function AppShell({
  activePage,
  onSelectPage,
  pageTitle,
  breadcrumbs = [],
  userRole,
  onRoleChange,
  onSaveCloud,
  isCloudSaving,
  onResetWorkspace,
  onRemoveDemo,
  user,
  onLogout,
  theme = 'light',
  onToggleTheme,
  teachers = [],
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const isLight = theme !== 'dark';

  return (
    <div className={`min-h-screen font-sans flex flex-col antialiased transition-colors duration-300 ${
      isLight
        ? 'bg-slate-50 text-slate-900'
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
        onOpenQRModal={() => setIsQRModalOpen(true)}
        onSaveCloud={onSaveCloud}
        isCloudSaving={isCloudSaving}
        onResetWorkspace={onResetWorkspace}
        onRemoveDemo={onRemoveDemo}
        user={user}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
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

      {/* Global Student Branch QR Code Modal */}
      <ShareTimetableModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />
    </div>
  );
}
