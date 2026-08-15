import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function DepartmentAnalyticsView({ rangeKey, startDate, endDate, onSelectFaculty }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptFaculty, setDeptFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, [rangeKey, startDate, endDate]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const params = { range_key: rangeKey };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get(`${API}/analytics/departments`, { params });
      setDepartments(res.data || []);
      if (res.data && res.data.length > 0 && !selectedDept) {
        setSelectedDept(res.data[0]);
      }
    } catch (e) {
      console.error("Failed to fetch department analytics:", e);
    } finally {
      setLoading(false);
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
      setDeptFaculty(res.data || []);
    } catch (e) {
      console.error("Failed to fetch department faculty:", e);
    } finally {
      setFacultyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center text-slate-400 animate-pulse">
        <p className="text-sm font-medium">Loading department operational analytics...</p>
      </div>
    );
  }

  const chartData = departments.map(d => ({
    name: d.department_name,
    "Low Load": d.workload_distribution.low,
    "Moderate Load": d.workload_distribution.moderate,
    "High Load": d.workload_distribution.high,
  }));

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Department Selector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.map((d) => {
          const isSelected = selectedDept?.department_id === d.department_id;
          return (
            <button
              key={d.department_id}
              onClick={() => setSelectedDept(d)}
              className={`p-5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500/50 shadow-xl shadow-indigo-500/10"
                  : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-white text-base">{d.department_name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {d.faculty_count} Faculty
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

      {/* Selected Department Detail */}
      {selectedDept && (
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedDept.department_name} Operational Overview</h2>
              <p className="text-xs text-slate-400 mt-1">HOD Department Operational Summary & Workload Distribution</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-slate-300">Total Leaves: <strong className="text-amber-400">{selectedDept.total_leave_days} days</strong></span>
              <span className="text-slate-300">Substitutions: <strong className="text-emerald-400">{selectedDept.total_substitutions}</strong></span>
              <span className="text-slate-300">Schedule Changes: <strong className="text-indigo-400">{selectedDept.schedule_changes}</strong></span>
            </div>
          </div>

          {/* Workload Distribution Chart */}
          <div className="card p-5 bg-slate-800/40 border border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Department Workload Distribution</h3>
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
            <h3 className="text-sm font-bold text-slate-200 mb-3">Faculty Members in {selectedDept.department_name}</h3>
            {facultyLoading ? (
              <p className="text-xs text-slate-400 italic">Loading faculty list...</p>
            ) : (
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
                            onClick={() => onSelectFaculty(f)}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
