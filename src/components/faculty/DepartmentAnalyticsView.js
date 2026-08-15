import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

const DEFAULT_DEPARTMENTS_DATA = [
  { department_id: "dept-cs", department_name: "Computer Science", faculty_count: 5, avg_attendance: 94.2, avg_workload: 18, total_leave_days: 12, total_substitutions: 8, schedule_changes: 3, workload_distribution: { low: 1, moderate: 3, high: 1 } },
  { department_id: "dept-it", department_name: "Information Technology", faculty_count: 4, avg_attendance: 92.8, avg_workload: 16, total_leave_days: 8, total_substitutions: 5, schedule_changes: 2, workload_distribution: { low: 1, moderate: 2, high: 1 } },
  { department_id: "dept-ec", department_name: "Electronics & Comm.", faculty_count: 4, avg_attendance: 90.5, avg_workload: 17, total_leave_days: 10, total_substitutions: 6, schedule_changes: 4, workload_distribution: { low: 0, moderate: 3, high: 1 } },
  { department_id: "dept-me", department_name: "Mechanical Eng.", faculty_count: 3, avg_attendance: 95.0, avg_workload: 15, total_leave_days: 4, total_substitutions: 2, schedule_changes: 1, workload_distribution: { low: 2, moderate: 1, high: 0 } },
  { department_id: "dept-ba", department_name: "Business Admin", faculty_count: 3, avg_attendance: 91.0, avg_workload: 14, total_leave_days: 6, total_substitutions: 3, schedule_changes: 1, workload_distribution: { low: 1, moderate: 2, high: 0 } },
];

export default function DepartmentAnalyticsView({
  rangeKey = "30d",
  startDate,
  endDate,
  sections = [],
  teachers = [],
  subjects = [],
  onSelectFaculty,
  onNavigate
}) {
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS_DATA);
  const [selectedDept, setSelectedDept] = useState(DEFAULT_DEPARTMENTS_DATA[0]);
  const [deptFaculty, setDeptFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, [rangeKey, startDate, endDate]);

  const fetchDepartments = async () => {
    try {
      const params = { range_key: rangeKey };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get(`${API}/analytics/departments`, { params });
      if (res.data && res.data.length > 0) {
        setDepartments(res.data);
        setSelectedDept(res.data[0]);
      }
    } catch (e) {
      console.warn("Using local department analytics fallback:", e);
    }
  };

  useEffect(() => {
    if (selectedDept) {
      fetchDeptFaculty(selectedDept.department_id);
    }
  }, [selectedDept, rangeKey, startDate, endDate]);

  const fetchDeptFaculty = async (deptId) => {
    try {
      setFacultyLoading(true);
      const params = { range_key: rangeKey, department_id: deptId };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get(`${API}/analytics/faculty`, { params });
      if (res.data && res.data.length > 0) {
        setDeptFaculty(res.data);
      } else {
        setDeptFaculty([]);
      }
    } catch (e) {
      console.warn("Using local faculty list fallback:", e);
      setDeptFaculty([]);
    } finally {
      setFacultyLoading(false);
    }
  };

  const activeDeptName = selectedDept?.department_name || "Computer Science";

  // Filter linked sections for selected department
  const linkedSections = sections.filter(s => (s.department || "Computer Science") === activeDeptName);

  // Filter linked subjects for selected department
  const linkedSubjects = subjects.filter(sub => (sub.department || "Computer Science") === activeDeptName || linkedSections.some(sec => Array.isArray(sub.sections) ? sub.sections.includes(sec.name) : sub.section === sec.name));

  const chartData = departments.map(d => ({
    name: d.department_name,
    "Low Load": d.workload_distribution?.low || 1,
    "Moderate Load": d.workload_distribution?.moderate || 2,
    "High Load": d.workload_distribution?.high || 1,
  }));

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Module Header */}
      <div className="card p-6 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              🏛️
            </span>
            Academic Department Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            HOD operational overview, interlinked sections & classes, faculty allocation, and department workload analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate("sections")}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            📚 Manage Classes / Sections
          </button>
        </div>
      </div>

      {/* Department Selector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {departments.map((d) => {
          const isSelected = selectedDept?.department_id === d.department_id;
          const deptSecCount = sections.filter(s => (s.department || "Computer Science") === d.department_name).length;
          return (
            <button
              key={d.department_id}
              onClick={() => setSelectedDept(d)}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500/50 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                  : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-white text-sm">{d.department_name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {deptSecCount || 1} Classes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Attendance</p>
                  <p className="font-black text-emerald-400 mt-0.5">{d.avg_attendance}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Workload</p>
                  <p className="font-black text-indigo-400 mt-0.5">{d.avg_workload} <span className="text-[9px] font-normal">p/wk</span></p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Department Detail & Interlinked Sections */}
      {selectedDept && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{activeDeptName} Operational Overview</h2>
              <p className="text-xs text-slate-400 mt-1">Interlinked Classes, Faculty Roster, and Workload Distribution</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-slate-300">Total Leaves: <strong className="text-amber-400">{selectedDept.total_leave_days} days</strong></span>
              <span className="text-slate-300">Substitutions: <strong className="text-emerald-400">{selectedDept.total_substitutions}</strong></span>
              <span className="text-slate-300">Schedule Changes: <strong className="text-indigo-400">{selectedDept.schedule_changes}</strong></span>
            </div>
          </div>

          {/* INTERLINKED SECTIONS / CLASSES SECTION */}
          <div className="card p-5 bg-slate-800/40 border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>📚</span> Classes / Sections in {activeDeptName} ({linkedSections.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Interlinked section cohorts ({linkedSections.length} classes, {linkedSubjects.length} subjects) mapped to this department
                </p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate("sections")}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 font-bold text-xs border border-indigo-500/30 transition-all"
              >
                + Add / Manage Classes
              </button>
            </div>

            {linkedSections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {linkedSections.map((sec, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30">
                          {sec.name ? sec.name[0] : 'S'}
                        </div>
                        <span className="font-bold text-white text-sm">{sec.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                        {sec.room || "Room 101"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">Lab: <strong className="text-purple-300">{sec.lab_room || "Auto"}</strong></span>
                      <button
                        onClick={() => onNavigate && onNavigate("timetable")}
                        className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] flex items-center gap-1"
                      >
                        View Timetable →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500 italic">
                No classes registered specifically under {activeDeptName} yet.
                <button onClick={() => onNavigate && onNavigate("sections")} className="text-indigo-400 underline font-semibold ml-2">
                  Create Class Section
                </button>
              </div>
            )}
          </div>

          {/* Workload Distribution Chart */}
          <div className="card p-5 bg-slate-800/40 border border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Department Workload Distribution Across Faculty</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 11}} />
                  <YAxis tick={{fill: '#94a3b8', fontSize: 11}} />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                  <Legend wrapperStyle={{fontSize: '11px', color: '#94a3b8'}} />
                  <Bar dataKey="Low Load" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Moderate Load" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="High Load" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Faculty Members Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-3">Faculty Members in {activeDeptName}</h3>
            {facultyLoading ? (
              <p className="text-xs text-slate-400 italic">Loading faculty list...</p>
            ) : deptFaculty.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="p-3">Faculty</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Attendance %</th>
                      <th className="p-3">Leave Days</th>
                      <th className="p-3">Weekly Load</th>
                      <th className="p-3">Substitutions</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {deptFaculty.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white">
                          <div>{f.teacher_name}</div>
                          <div className="text-[10px] text-slate-500">{f.employee_id}</div>
                        </td>
                        <td className="p-3">{f.designation}</td>
                        <td className="p-3 font-bold text-emerald-400">{f.attendance_percentage}%</td>
                        <td className="p-3">{f.leave_days}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.workload_status === 'High' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {f.weekly_workload} p/wk ({f.workload_status})
                          </span>
                        </td>
                        <td className="p-3">{f.substitutions_provided} Prov / {f.substitutions_received} Rec</td>
                        <td className="p-3">
                          <button
                            onClick={() => onSelectFaculty && onSelectFaculty(f)}
                            className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 text-[11px] font-bold transition-all"
                          >
                            View Analytics Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-800/30 border border-slate-800 rounded-xl">
                Active department directory loaded. Navigate to <button onClick={() => onNavigate && onNavigate("faculty")} className="text-indigo-400 underline font-semibold">Faculty Directory</button> to view full roster.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
