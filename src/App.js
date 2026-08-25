import React, { Suspense, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { AcademicProvider, useAcademic } from "./context/AcademicContext";
import { API_BASE_URL } from "./apiConfig";
import { exportTimetableToExcel } from "./utils/exportUtils";
import BrandLogo from "./components/common/BrandLogo";
import GooeyLoader from "./components/common/GooeyLoader";
import AppShell from "./components/shell/AppShell";
import NotFoundPage from "./components/common/NotFoundPage";
import NetworkStatusWatcher from "./components/common/NetworkStatusWatcher";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { lazyWithRetry } from "./utils/lazyWithRetry";

// Dynamic Section / View Imports with Chunk Auto-Recovery
const LandingPage = lazyWithRetry(() => import("./components/landing/LandingPage"), "LandingPage");
const LoginPage = lazyWithRetry(() => import("./components/LoginPage"), "LoginPage");
const NoInternetPage = lazyWithRetry(() => import("./components/common/NoInternetPage"), "NoInternetPage");
const TeacherDashboard = lazyWithRetry(() => import("./components/TeacherDashboard"), "TeacherDashboard");
const InstitutionalDashboard = lazyWithRetry(() => import("./components/dashboard/InstitutionalDashboard"), "InstitutionalDashboard");
const TimetableGrid = lazyWithRetry(() => import("./components/TimetableGrid"), "TimetableGrid");
const FacultyDashboardStats = lazyWithRetry(() => import("./components/faculty/FacultyDashboardStats"), "FacultyDashboardStats");
const FacultyDirectory = lazyWithRetry(() => import("./components/faculty/FacultyDirectory"), "FacultyDirectory");
const FacultyProfile = lazyWithRetry(() => import("./components/faculty/FacultyProfile"), "FacultyProfile");
const AttendanceDashboard = lazyWithRetry(() => import("./components/faculty/AttendanceDashboard"), "AttendanceDashboard");
const FacultyAnalyticsModule = lazyWithRetry(() => import("./components/faculty/FacultyAnalyticsModule"), "FacultyAnalyticsModule");
const LeaveManagement = lazyWithRetry(() => import("./components/faculty/LeaveManagement"), "LeaveManagement");
const SubstitutionPanel = lazyWithRetry(() => import("./components/faculty/SubstitutionPanel"), "SubstitutionPanel");
const SubjectsSection = lazyWithRetry(() => import("./components/SubjectsSection"), "SubjectsSection");
const SectionsManagement = lazyWithRetry(() => import("./components/sections/SectionsManagement"), "SectionsManagement");
const RoomsSection = lazyWithRetry(() => import("./components/RoomsSection"), "RoomsSection");
const TimeSlotsSection = lazyWithRetry(() => import("./components/TimeSlotsSection"), "TimeSlotsSection");
const IntegrationsSection = lazyWithRetry(() => import("./components/IntegrationsSection"), "IntegrationsSection");
const SystemSettings = lazyWithRetry(() => import("./components/settings/SystemSettings"), "SystemSettings");
const AIChatBot = lazyWithRetry(() => import("./components/AIChatBot"), "AIChatBot");
const PublicTimetablePortal = lazyWithRetry(() => import("./components/public/PublicTimetablePortal"), "PublicTimetablePortal");
const DataIngestCenter = lazyWithRetry(() => import("./components/ingest/DataIngestCenter"), "DataIngestCenter");

function ModuleLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] w-full p-12 animate-fade-in">
      <GooeyLoader
        size="md"
        text="Loading module..."
        subtitle="Preparing view and academic datasets"
      />
    </div>
  );
}

function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <BrandLogo size="lg" isWarm={false} />
      </div>
      <GooeyLoader
        size="lg"
        text="Preparing Academic Workspace"
        subtitle="Establishing Supabase real-time connection & solver engine"
      />
    </div>
  );
}

function ErrorAlert({ error }) {
  if (!error) return null;
  const info = typeof error === "string"
    ? { title: error, suggestions: [], facts: [] }
    : error;

  return (
    <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm px-5 py-4 text-sm text-red-100 mb-4">
      <svg
        className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold text-red-50">{info.title}</p>
        {info.facts?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {info.facts.map((fact, index) => (
              <span key={`${fact}-${index}`} className="rounded-md border border-red-400/20 bg-red-950/30 px-2 py-1 text-xs text-red-100">
                {fact}
              </span>
            ))}
          </div>
        )}
        {info.suggestions?.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100/90">
            {info.suggestions.map((suggestion, index) => (
              <li key={`${suggestion}-${index}`}>{suggestion}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const getBreadcrumbsForPath = (pathname) => {
  if (pathname === "/" || pathname === "/dashboard") return ["Dashboard"];
  if (pathname === "/timetable") return ["Main", "Timetable Workspace"];
  if (pathname.startsWith("/faculty")) return ["Main", "Faculty Directory"];
  if (pathname === "/attendance") return ["Main", "Attendance Tracking"];
  if (pathname === "/leave") return ["Main", "Leave Management"];
  if (pathname === "/substitutions") return ["Main", "Substitution Center"];
  if (pathname === "/analytics") return ["Main", "Operational Analytics 360°"];
  if (pathname === "/academic/subjects") return ["Academic Setup", "Subjects Catalog"];
  if (pathname === "/academic/sections") return ["Academic Setup", "Sections & Classes"];
  if (pathname === "/academic/rooms") return ["Academic Setup", "Classrooms & Labs"];
  if (pathname === "/academic/slots") return ["Academic Setup", "Time Slots"];
  if (pathname === "/operations/ingest" || pathname === "/ingest" || pathname === "/import") return ["Operations", "Data Ingestion & OCR Intelligence"];
  if (pathname === "/operations/reschedule") return ["Operations", "Reschedule Engine"];
  if (pathname === "/operations/history") return ["Operations", "History & Audit Logs"];
  if (pathname === "/operations/integrations") return ["Operations", "Automation & Broadcast"];
  if (pathname === "/operations/settings") return ["Operations", "System Settings"];
  if (pathname === "/reports") return ["Reports", "Reports Center"];
  return ["Overview"];
};

// ── Sub-view Components ──

function TimetableWorkspaceRoute() {
  const navigate = useNavigate();
  const {
    result,
    teachers,
    subjects,
    sections,
    loading,
    generateTimetable,
    setReschedulePreselect,
    setRescheduleNote,
    setError
  } = useAcademic();

  const handleNavigateToReschedule = (preselect) => {
    setReschedulePreselect(preselect);
    navigate("/operations/reschedule");
  };

  const saveToDatabase = async () => {
    if (!result) return;
    try {
      await axios.post(`${API_BASE_URL}/save`, {
        name: `Timetable - ${new Date().toLocaleString()}`,
        timetable_data: result,
      });
      setRescheduleNote("Timetable saved to SQLite database successfully!");
    } catch (e) {
      setError("Failed to save timetable to database.");
    }
  };

  const exportToExcel = useCallback(() => {
    if (!result) return;
    exportTimetableToExcel(result, sections, teachers, subjects);
  }, [result, sections, teachers, subjects]);

  return (
    <div className="space-y-6">
      {/* Solver Controls Header Bar */}
      <div className="card p-5 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Academic Timetable Solver Workspace</h2>
          <p className="text-xs text-slate-400 mt-0.5">Generate, optimize, view, and export constraint-validated timetable grids.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-gradient text-xs py-2.5 px-5 font-bold flex items-center gap-2"
            disabled={loading || teachers.length === 0 || subjects.length === 0}
            onClick={generateTimetable}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Solving...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Generate AI Timetable
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Status: {result.solver_status}</span>
          </div>
          <div className="text-violet-300">Score: <strong className="text-white">{result.objective_score}</strong></div>
          <div className="text-emerald-300">Scheduled Classes: <strong className="text-white">{result.assignments?.length || 0}</strong></div>
        </div>
      )}

      <TimetableGrid
        result={result}
        subjects={subjects}
        loading={loading}
        onExport={exportToExcel}
        onSaveDb={saveToDatabase}
        onNavigateToReschedule={handleNavigateToReschedule}
      />
    </div>
  );
}

function FacultyDirectoryRoute() {
  const navigate = useNavigate();
  const {
    teachers,
    subjects,
    sections,
    result,
    setSelectedFaculty,
    handleAddFaculty,
    handleBatchImportData,
    handleTeachersChange
  } = useAcademic();

  return (
    <div>
      <FacultyDashboardStats />
      <div className="space-y-8 mt-6">
        <FacultyDirectory
          teachers={teachers}
          subjects={subjects}
          sections={sections}
          result={result}
          onSelectFaculty={(f) => {
            setSelectedFaculty(f);
            if (f?.id) navigate(`/faculty/${f.id}`);
          }}
          onAddFaculty={handleAddFaculty}
          onBatchImport={handleBatchImportData}
          onTeachersChange={handleTeachersChange}
        />
        <AttendanceDashboard />
      </div>
    </div>
  );
}

function FacultyProfileRoute() {
  const { facultyId } = useParams();
  const navigate = useNavigate();
  const { selectedFaculty, setSelectedFaculty } = useAcademic();
  const targetFaculty = selectedFaculty || { id: facultyId };

  return (
    <FacultyProfile
      faculty={targetFaculty}
      onBack={() => {
        setSelectedFaculty(null);
        navigate("/faculty");
      }}
    />
  );
}

// ── Admin Shell Layout ──

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    userRole,
    setUserRole,
    teachers,
    subjects,
    setSubjects,
    sections,
    setSections,
    rooms,
    setRooms,
    timeSlots,
    setTimeSlots,
    result,
    loading,
    error,
    rescheduleNote,
    saveToCloud,
    handleResetWorkspace,
    handleRemoveDemoData,
    generateTimetable,
    handleAddFaculty,
    handleBatchImportData,
    handleLogout,
    theme,
    toggleTheme,
  } = useAcademic();

  const currentPath = location.pathname;
  const breadcrumbs = getBreadcrumbsForPath(currentPath);

  // Active page key for sidebar highlighting
  const activePage = currentPath === "/" || currentPath === "/dashboard"
    ? "dashboard"
    : currentPath.replace(/^\/(academic\/|operations\/)?/, "");

  return (
    <AppShell
      activePage={activePage}
      onSelectPage={(page, id) => {
        if (id) {
          navigate(`/faculty/${id}`);
        } else if (page) {
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
          const target = page.startsWith("/") ? page : (PAGE_ROUTE_MAP[page] || `/${page}`);
          navigate(target);
        }
      }}
      pageTitle={breadcrumbs.slice(-1)[0]}
      breadcrumbs={breadcrumbs}
      userRole={userRole}
      onRoleChange={setUserRole}
      onSaveCloud={saveToCloud}
      isCloudSaving={loading}
      onResetWorkspace={handleResetWorkspace}
      onRemoveDemo={handleRemoveDemoData}
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
      teachers={teachers}
    >
      {/* Global Alerts */}
      <ErrorAlert error={error} />
      {rescheduleNote && (
        <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-sm px-5 py-4 text-sm text-emerald-900 dark:text-emerald-200 font-semibold mb-4 shadow-sm">
          <svg className="w-4 h-4 text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-emerald-900 dark:text-emerald-200">{rescheduleNote}</span>
        </div>
      )}

      {/* Dynamic Module Content */}
      <Suspense fallback={<ModuleLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <InstitutionalDashboard
                teachersCount={teachers.length}
                sectionsCount={sections.length}
                subjectsCount={subjects.length}
                roomsCount={rooms.length}
                hasResult={!!result}
                onNavigate={(page) => navigate(page === "timetable" ? "/timetable" : (page.startsWith("/") ? page : `/${page}`))}
              />
            }
          />
          <Route path="/timetable" element={<TimetableWorkspaceRoute />} />
          <Route path="/faculty" element={<FacultyDirectoryRoute />} />
          <Route path="/faculty/:facultyId" element={<FacultyProfileRoute />} />
          <Route path="/faculty-directory" element={<Navigate to="/faculty" replace />} />
          <Route path="/attendance" element={<Navigate to="/dashboard" replace />} />
          <Route path="/leave" element={<LeaveManagement isAdmin={true} />} />
          <Route path="/substitutions" element={<SubstitutionPanel />} />
          <Route path="/analytics" element={<FacultyAnalyticsModule />} />
          
          {/* Academic Setup Routes & Shorthands */}
          <Route
            path="/academic/subjects"
            element={
              <SubjectsSection
                subjects={subjects}
                teachers={teachers}
                sections={sections}
                rooms={rooms}
                onChange={(updated) => {
                  setSubjects(updated);
                  saveToCloud(true, { subjects: updated });
                }}
              />
            }
          />
          <Route path="/subjects" element={<Navigate to="/academic/subjects" replace />} />
          
          <Route
            path="/academic/sections"
            element={
              <SectionsManagement
                sections={sections}
                rooms={rooms}
                subjects={subjects}
                teachers={teachers}
                onChange={(updated) => {
                  setSections(updated);
                  saveToCloud(true, { sections: updated });
                }}
                onNavigate={(p) => navigate(p === "timetable" ? "/timetable" : (p.startsWith("/") ? p : `/${p}`))}
              />
            }
          />
          <Route path="/sections" element={<Navigate to="/academic/sections" replace />} />
          
          <Route
            path="/academic/rooms"
            element={
              <RoomsSection
                rooms={rooms}
                onChange={(updated) => {
                  setRooms(updated);
                  saveToCloud(true, { rooms: updated });
                }}
                result={result}
                timeSlots={timeSlots}
              />
            }
          />
          <Route path="/rooms" element={<Navigate to="/academic/rooms" replace />} />
          
          <Route path="/academic/slots" element={<TimeSlotsSection timeSlots={timeSlots} onChange={(updated) => { setTimeSlots(updated); saveToCloud(true, { timeSlots: updated }); }} />} />
          <Route path="/slots" element={<Navigate to="/academic/slots" replace />} />
          
          {/* Operations & Data Ingestion Center */}
          <Route path="/operations/ingest" element={<DataIngestCenter />} />
          <Route path="/ingest" element={<Navigate to="/operations/ingest" replace />} />
          <Route path="/import" element={<Navigate to="/operations/ingest" replace />} />
          <Route path="/ocr" element={<Navigate to="/operations/ingest" replace />} />

          {/* Operations Routes & Clean Redirects */}
          <Route path="/operations/reschedule" element={<Navigate to="/timetable" replace />} />
          <Route path="/reschedule" element={<Navigate to="/timetable" replace />} />
          <Route path="/operations/history" element={<Navigate to="/timetable" replace />} />
          <Route path="/history" element={<Navigate to="/timetable" replace />} />
          
          <Route path="/operations/integrations" element={<IntegrationsSection />} />
          <Route path="/integrations" element={<Navigate to="/operations/integrations" replace />} />
          
          <Route path="/operations/settings" element={<SystemSettings userRole={userRole} />} />
          <Route path="/settings" element={<Navigate to="/operations/settings" replace />} />
          
          {/* Public Timetable Portal for Live Sharing & Mobile Viewers */}
          <Route path="/public/timetable" element={<PublicTimetablePortal />} />
          <Route path="/p/:batchId" element={<PublicTimetablePortal />} />

          {/* Faculty / Portal View for Admin */}
          <Route
            path="/portal"
            element={
              <TeacherDashboard
                user={user}
                result={result}
                teachers={teachers}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                onSwitchToAdmin={() => setUserRole("Admin")}
              />
            }
          />
          {/* Offline Diagnostics & No Internet Route */}
          <Route path="/offline" element={<NoInternetPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/reports" element={<Navigate to="/analytics" replace />} />
          
          {/* Universal Catch-All Route for Admin Layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* Floating AIChatBot Assistant */}
      <Suspense fallback={null}>
        <AIChatBot
          result={result}
          teachers={teachers}
          subjects={subjects}
          sections={sections}
          rooms={rooms}
          timeSlots={timeSlots}
          onResetWorkspace={handleResetWorkspace}
          onRemoveDemo={handleRemoveDemoData}
          onGenerateTimetable={generateTimetable}
          onAddFaculty={handleAddFaculty}
          onExtractedData={(data) => {
            if (!data) return;
            handleBatchImportData({
              teachers: data.teachers || [],
              sections: data.sections || [],
              subjects: data.subjects || []
            });
            if (data.rooms && data.rooms.length > 0) {
              setRooms(data.rooms);
            }
          }}
        />
      </Suspense>
    </AppShell>
  );
}

// ── Root Application Router Component ──

function AppContent() {
  const navigate = useNavigate();
  const { user, userRole, setUserRole, handleLogout, theme, toggleTheme, teachers, result } = useAcademic();

  const handleSwitchToAdmin = () => {
    setUserRole("Admin");
    navigate("/dashboard");
  };

  // If user is not logged in, allow public timetable viewing or landing page & login
  if (!user) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <NetworkStatusWatcher />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/public/timetable" element={<PublicTimetablePortal />} />
          <Route path="/p/:batchId" element={<PublicTimetablePortal />} />
          <Route path="/offline" element={<NoInternetPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // If user is logged in as Faculty / Teacher, render TeacherDashboard
  if (userRole === "Faculty" || userRole === "Teacher" || userRole === "teacher" || user.role === "teacher") {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <NetworkStatusWatcher />
        <Routes>
          <Route
            path="/portal"
            element={
              <TeacherDashboard
                user={user}
                result={result}
                teachers={teachers}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                onSwitchToAdmin={handleSwitchToAdmin}
              />
            }
          />
          <Route
            path="/portal/:tab"
            element={
              <TeacherDashboard
                user={user}
                result={result}
                teachers={teachers}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                onSwitchToAdmin={handleSwitchToAdmin}
              />
            }
          />
          <Route path="/public/timetable" element={<PublicTimetablePortal />} />
          <Route path="/p/:batchId" element={<PublicTimetablePortal />} />
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="/home" element={<Navigate to="/portal" replace />} />
          <Route path="/login" element={<Navigate to="/portal" replace />} />
          <Route path="/dashboard" element={<Navigate to="/portal" replace />} />
          <Route path="/timetable" element={<Navigate to="/portal" replace />} />
          <Route path="/attendance" element={<Navigate to="/portal" replace />} />
          <Route path="/leave" element={<Navigate to="/portal" replace />} />
          <Route path="/reports" element={<Navigate to="/portal" replace />} />
          <Route path="/offline" element={<NoInternetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    );
  }

  // Admin / Dean portal
  return (
    <>
      <NetworkStatusWatcher />
      <AdminLayout />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AcademicProvider>
          <AppContent />
        </AcademicProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

