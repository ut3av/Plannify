import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function CommandPaletteModal({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(getQuickActions());
      return;
    }
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const getQuickActions = () => [
    { type: "action", label: "Open Timetable Workspace", page: "timetable", icon: "grid" },
    { type: "action", label: "View Faculty Directory", page: "faculty", icon: "users" },
    { type: "action", label: "Open Attendance Dashboard", page: "attendance", icon: "clock" },
    { type: "action", label: "Open Leave Management", page: "leave", icon: "calendar" },
    { type: "action", label: "Open Substitution Center", page: "substitutions", icon: "user-check" },
    { type: "action", label: "View Operational Analytics", page: "analytics", icon: "bar-chart" },
    { type: "action", label: "Academic Setup: Subjects", page: "subjects", icon: "book-open" },
    { type: "action", label: "Academic Setup: Classrooms", page: "rooms", icon: "building" },
  ];

  const performSearch = async (searchTerm) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/analytics/faculty`, { params: { search: searchTerm } });
      const facultyMatches = (res.data || []).map(f => ({
        type: "faculty",
        label: f.teacher_name,
        detail: `${f.employee_id} • ${f.department_name} (${f.designation})`,
        page: "faculty",
        id: f.id,
      }));

      // Combine with static action matches
      const actionMatches = getQuickActions().filter(a => a.label.toLowerCase().includes(searchTerm.toLowerCase()));
      setResults([...actionMatches, ...facultyMatches]);
    } catch (e) {
      console.error("Command palette search error:", e);
      setResults(getQuickActions().filter(a => a.label.toLowerCase().includes(searchTerm.toLowerCase())));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 z-50 animate-fade-in">
      <div className="card p-0 bg-slate-900 border border-indigo-500/30 max-w-xl w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Input Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search faculty, employee ID, subjects, rooms, or actions..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
          />
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white font-mono bg-slate-800 px-2 py-1 rounded">
            ESC
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 text-xs">
          {loading ? (
            <div className="p-4 text-center text-slate-400 italic">Searching Planify database...</div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onNavigate(item.page, item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-all text-slate-200 group border border-transparent hover:border-slate-700"
              >
                <div>
                  <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">{item.label}</p>
                  {item.detail && <p className="text-[11px] text-slate-400 mt-0.5">{item.detail}</p>}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  Jump →
                </span>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500 italic">
              No matching record found. Try searching by faculty name, employee ID, or room code.
            </div>
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center px-4">
          <span>Use <strong>↑↓</strong> to navigate, <strong>Enter</strong> to select</span>
          <span>Planify Global Search</span>
        </div>
      </div>
    </div>
  );
}
