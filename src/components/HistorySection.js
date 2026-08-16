import { useState, useEffect } from "react";
import axios from "axios";

import { API_BASE_URL } from "../apiConfig";

export default function HistorySection({ onSelectTimetable }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/saved`);
      setHistory(response.data);
    } catch (err) {
      setError("Failed to load history. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const loadTimetable = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/saved/${id}`);
      onSelectTimetable(response.data);
    } catch (err) {
      alert("Failed to load this timetable.");
    }
  };

  const deleteTimetable = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this timetable?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/saved/${id}`);
      setHistory(history.filter(item => item.id !== id));
    } catch (err) {
      alert("Failed to delete this timetable.");
    }
  };

  if (error) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-10 h-10 border-2 border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">!</div>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400">Loading history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-scale-in">
        <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No saved records</h3>
        <p className="text-sm text-slate-400">Generate and save a timetable to see it here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
      {history.map((item) => (
        <div
          key={item.id}
          className="glass-card group p-5 hover:border-violet-500/40 transition-all cursor-pointer"
          onClick={() => loadTimetable(item.id)}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-white/[0.04] px-2 py-1 rounded">
                #{item.id}
              </span>
              <button 
                onClick={(e) => deleteTimetable(e, item.id)}
                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10"
                title="Delete Timetable"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
              </button>
            </div>
          </div>
          <h3 className="font-bold text-slate-100 group-hover:text-violet-400 transition-colors truncate">
            {item.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(item.created_at).toLocaleString()}
          </p>
          <div className="mt-4 flex items-center gap-2 text-violet-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            View Details 
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
