import { useState, useEffect } from "react";
import axios from "axios";

import { API_BASE_URL as API } from "../../apiConfig";

export default function FacultyDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/faculty/dashboard-stats`);
      setStats(res.data);
    } catch (e) {
      console.error("Dashboard stats error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
            <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "Total Faculty",
      value: stats.total_faculty,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
      color: "#1e40af",
      bgColor: "#dbeafe",
    },
    {
      label: "Present Today",
      value: stats.present_today,
      subtitle: `${stats.attendance_rate}% rate`,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      color: "#16a34a",
      bgColor: "#dcfce7",
    },
    {
      label: "On Leave Today",
      value: stats.on_leave_today,
      subtitle: `${stats.absent_today} absent`,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        </svg>
      ),
      color: "#d97706",
      bgColor: "#fef3c7",
    },
    {
      label: "Pending Requests",
      value: stats.pending_leaves,
      subtitle: "needs review",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: stats.pending_leaves > 0 ? "#dc2626" : "#64748b",
      bgColor: stats.pending_leaves > 0 ? "#fee2e2" : "#f1f5f9",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
      {cards.map((card, i) => (
        <div key={i} className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <span className="stat-label">{card.label}</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: card.bgColor, color: card.color }}>
              {card.icon}
            </div>
          </div>
          <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
          {card.subtitle && (
            <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
