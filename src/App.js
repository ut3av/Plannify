import React, { lazy, Suspense, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { saveAs } from "file-saver";

import { AcademicProvider, useAcademic } from "./context/AcademicContext";
import { API_BASE_URL } from "./apiConfig";
import BrandLogo from "./components/common/BrandLogo";
import GooeyLoader from "./components/common/GooeyLoader";
import AppShell from "./components/shell/AppShell";
import NotFoundPage from "./components/common/NotFoundPage";

// Dynamic Section / View Imports (React.lazy)
const LoginPage = lazy(() => import("./components/LoginPage"));
const TeacherDashboard = lazy(() => import("./components/TeacherDashboard"));
const InstitutionalDashboard = lazy(() => import("./components/dashboard/InstitutionalDashboard"));
const TimetableGrid = lazy(() => import("./components/TimetableGrid"));
const FacultyDashboardStats = lazy(() => import("./components/faculty/FacultyDashboardStats"));
const FacultyDirectory = lazy(() => import("./components/faculty/FacultyDirectory"));
const FacultyProfile = lazy(() => import("./components/faculty/FacultyProfile"));
const AttendanceDashboard = lazy(() => import("./components/faculty/AttendanceDashboard"));
const FacultyAnalyticsModule = lazy(() => import("./components/faculty/FacultyAnalyticsModule"));
const LeaveManagement = lazy(() => import("./components/faculty/LeaveManagement"));
const SubstitutionPanel = lazy(() => import("./components/faculty/SubstitutionPanel"));
const SubjectsSection = lazy(() => import("./components/SubjectsSection"));
const SectionsManagement = lazy(() => import("./components/sections/SectionsManagement"));
const RoomsSection = lazy(() => import("./components/RoomsSection"));
const TimeSlotsSection = lazy(() => import("./components/TimeSlotsSection"));
const ReschedulePanel = lazy(() => import("./components/ReschedulePanel"));
const HistorySection = lazy(() => import("./components/HistorySection"));
const IntegrationsSection = lazy(() => import("./components/IntegrationsSection"));
const SystemSettings = lazy(() => import("./components/settings/SystemSettings"));
const ReportsCenter = lazy(() => import("./components/reports/ReportsCenter"));
const AIChatBot = lazy(() => import("./components/AIChatBot"));

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
      <div className="flex items-center gap-2.5 mb-6">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">INITIALIZING</span>
        <BrandLogo size="md" />
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

  const exportToExcel = useCallback(async () => {
    if (!result) return;
    const XLSX = await import("xlsx");
    const sectionsSet = new Set();
    if (result.assignments) {
      result.assignments.forEach((a) => {
        if (a.section) sectionsSet.add(a.section);
      });
    }
    if (sectionsSet.size === 0) sectionsSet.add("Default");

    const workbook = XLSX.utils.book_new();

    sectionsSet.forEach((section) => {
      const branchName = section.includes("-") ? section.split("-")[0] : "Default";
      const sectionName = section.includes("-") ? section.split("-")[1] : section;
      const sectionObj = sections.find((s) => s.name === section);
      const roomDisplay = sectionObj && sectionObj.room ? sectionObj.room : "Auto";
      const headerInfoRow = [
        `Branch: ${branchName}`,
        "",
        `Section: ${sectionName}`,
        "",
        `Room No.: ${roomDisplay}`,
        "",
        `Classes w.e.f.: ${new Date().toLocaleDateString()}`,
      ];

      const periodNums = ["Day / (Period & Time)"];
      const timeSlotsRow = [""];
      const lunchColIdxList = [];

      let periodCounter = 1;
      for (let i = 0; i < result.time_slots.length; i++) {
        periodNums.push(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][periodCounter - 1] || periodCounter.toString());
        timeSlotsRow.push(result.time_slots[i]);

        if (i < result.time_slots.length - 1) {
          const endMatch = result.time_slots[i].split("-")[1]?.trim();
          const nextStartMatch = result.time_slots[i + 1].split("-")[0]?.trim();
          if (endMatch && nextStartMatch && endMatch !== nextStartMatch) {
            periodNums.push("");
            timeSlotsRow.push("LUNCH");
            lunchColIdxList.push(timeSlotsRow.length - 1);
          }
        }
        periodCounter++;
      }

      const rows = [headerInfoRow, periodNums, timeSlotsRow];
      const sectionSubjectsMap = new Map();

      result.days.forEach((day) => {
        const row = [day];
        let slotCounter = 0;

        for (let i = 1; i < timeSlotsRow.length; i++) {
          if (lunchColIdxList.includes(i)) {
            row.push("");
            continue;
          }
          const slotName = result.time_slots[slotCounter];
          const assignments = result.timetable?.[day]?.[slotName] || [];
          const secAssigned = assignments.find(
            (a) => a.section === section || (!a.section && section === "Default"),
          );

          if (!secAssigned) {
            row.push("");
          } else {
            if (secAssigned.code || secAssigned.subject) {
              sectionSubjectsMap.set(
                secAssigned.code || secAssigned.subject,
                secAssigned,
              );
            }
            row.push(secAssigned.code ? secAssigned.code : secAssigned.subject);
          }
          slotCounter++;
        }
        rows.push(row);
      });

      rows.push([]);
      rows.push(["Subjects as per University Scheme", "", "Lab. Room No.", "Name of Faculty"]);
      rows.push(["Code No.", "Name of Subject", "", ""]);

      sectionSubjectsMap.forEach((info) => {
        rows.push([
          info.code || "-",
          info.subject || "-",
          info.is_lab ? info.room : "",
          info.teacher || "-",
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      if (!worksheet["!merges"]) worksheet["!merges"] = [];
      const subjHeaderRowIdx = 4 + result.days.length;
      worksheet["!merges"].push({
        s: { r: subjHeaderRowIdx, c: 0 },
        e: { r: subjHeaderRowIdx, c: 1 },
      });

      let sheetName = section.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 31);
      if (!sheetName) sheetName = "Sheet1";
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      lunchColIdxList.forEach((colIdx) => {
        const startRow = 2;
        const endRow = 2 + result.days.length;
        worksheet["!merges"].push({
          s: { r: startRow, c: colIdx },
          e: { r: endRow, c: colIdx },
        });
      });
    });

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, `timetable_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [result, sections]);

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
            {loading ? "Solving..." : "✨ Generate AI Timetable"}
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
    result,
    setSelectedFaculty,
    handleAddFaculty,
    handleTeachersChange
  } = useAcademic();

  return (
    <div>
      <FacultyDashboardStats />
      <div className="space-y-8 mt-6">
        <FacultyDirectory
          teachers={teachers}
          subjects={subjects}
          result={result}
          onSelectFaculty={(f) => {
            setSelectedFaculty(f);
            if (f?.id) navigate(`/faculty/${f.id}`);
          }}
          onAddFaculty={handleAddFaculty}
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
    setResult,
    loading,
    error,
    rescheduleNote,
    setRescheduleNote,
    reschedulePreselect,
    rescheduleTimetable,
    assignProxy,
    saveToCloud,
    generateDemoTimetable,
    handleRemoveDemoData,
    generateTimetable,
    handleAddFaculty,
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
        if (id) navigate(`/faculty/${id}`);
      }}
      pageTitle={breadcrumbs.slice(-1)[0]}
      breadcrumbs={breadcrumbs}
      userRole={userRole}
      onRoleChange={setUserRole}
      onSaveCloud={saveToCloud}
      isCloudSaving={loading}
      onLoadDemo={generateDemoTimetable}
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
        <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm px-5 py-4 text-sm text-emerald-200 mb-4">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{rescheduleNote}</span>
        </div>
      )}

      {/* Dynamic Module Content */}
      <Suspense fallback={<ModuleLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <InstitutionalDashboard
                teachersCount={teachers.length}
                sectionsCount={sections.length}
                subjectsCount={subjects.length}
                roomsCount={rooms.length}
                hasResult={!!result}
                onNavigate={(page) => navigate(page === "timetable" ? "/timetable" : `/${page}`)}
              />
            }
          />
          <Route path="/timetable" element={<TimetableWorkspaceRoute />} />
          <Route path="/faculty" element={<FacultyDirectoryRoute />} />
          <Route path="/faculty/:facultyId" element={<FacultyProfileRoute />} />
          <Route
            path="/attendance"
            element={
              <div className="space-y-6">
                <FacultyDashboardStats />
                <AttendanceDashboard />
              </div>
            }
          />
          <Route path="/leave" element={<LeaveManagement isAdmin={true} />} />
          <Route path="/substitutions" element={<SubstitutionPanel />} />
          <Route path="/analytics" element={<FacultyAnalyticsModule />} />
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
                onNavigate={(p) => navigate(p === "timetable" ? "/timetable" : `/${p}`)}
              />
            }
          />
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
          <Route
            path="/academic/slots"
            element={
              <TimeSlotsSection
                timeSlots={timeSlots}
                onChange={(updated) => {
                  setTimeSlots(updated);
                  saveToCloud(true, { timeSlots: updated });
                }}
              />
            }
          />
          <Route
            path="/operations/reschedule"
            element={
              <ReschedulePanel
                teachers={teachers}
                days={result?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"]}
                slots={result?.time_slots || timeSlots}
                hasResult={!!result}
                result={result}
                loading={loading}
                preselect={reschedulePreselect}
                onBackToTimetable={() => navigate("/timetable")}
                onReschedule={rescheduleTimetable}
                onAssignProxy={assignProxy}
              />
            }
          />
          <Route
            path="/operations/history"
            element={
              <HistorySection
                onSelectTimetable={(data) => {
                  setResult(data);
                  navigate("/timetable");
                  setRescheduleNote("Loaded saved timetable from database.");
                }}
              />
            }
          />
          <Route path="/operations/integrations" element={<IntegrationsSection />} />
          <Route path="/operations/settings" element={<SystemSettings userRole={userRole} />} />
          <Route path="/reports" element={<ReportsCenter />} />
          
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
          onLoadDemo={generateDemoTimetable}
          onRemoveDemo={handleRemoveDemoData}
          onGenerateTimetable={generateTimetable}
          onAddFaculty={handleAddFaculty}
          onExtractedData={(data) => {
            if (!data) return;
            if (data.teachers && data.teachers.length > 0) {
              data.teachers.forEach(t => handleAddFaculty(t));
            }
            if (data.subjects && data.subjects.length > 0) {
              setSubjects(data.subjects);
            }
            if (data.sections && data.sections.length > 0) {
              setSections(data.sections);
            }
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
  const { user, userRole, handleLogout, theme, toggleTheme, teachers, result } = useAcademic();

  // If user is not logged in, render the login page
  if (!user) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>
    );
  }

  // If user is logged in as Faculty / Teacher, render TeacherDashboard
  if (userRole === "Faculty" || userRole === "Teacher" || userRole === "teacher" || user.role === "teacher") {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
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
              />
            }
          />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Admin / Dean portal
  return <AdminLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AcademicProvider>
        <AppContent />
      </AcademicProvider>
    </BrowserRouter>
  );
}
