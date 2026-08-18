import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import {
  getLeaveApplications,
  getSubstitutionLogs,
  subscribeToTable,
} from "../../services/realtimeFacultyService";

export default function NotificationCenter({
  isOpen,
  onClose,
  onNavigate,
  onUpdateUnreadCount,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRealtimeNotifications = useCallback(async () => {
    try {
      const notifList = [];

      // 1. Fetch real pending & recent leaves from realtime faculty service
      try {
        const leaves = await getLeaveApplications();
        if (Array.isArray(leaves) && leaves.length > 0) {
          leaves.slice(0, 10).forEach((l) => {
            const isPending = l.status === "pending";
            const facultyName = l.faculty_name || "Faculty Member";
            const leaveType = l.leave_type_name || l.leave_type_code || "Leave";
            const timeStr = l.applied_at
              ? new Date(l.applied_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Recently";

            notifList.push({
              id: `leave-${l.id}`,
              type: "leave",
              title: isPending ? "Pending Leave Request" : `Leave ${l.status?.toUpperCase() || "REVIEWED"}`,
              description: `${facultyName} applied for ${leaveType}: "${l.reason || "Personal Leave"}" (${l.from_date} to ${l.to_date}${l.half_day ? " - Half Day" : ""})`,
              timestamp: timeStr,
              unread: isPending,
              actionTarget: "leave",
              badgeColor: isPending
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : l.status === "approved"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border-rose-500/30",
            });
          });
        }
      } catch (err) {
        console.warn("Could not fetch leaves for notification center:", err);
      }

      // 2. Fetch real substitution / proxy logs
      try {
        const subs = await getSubstitutionLogs();
        if (Array.isArray(subs) && subs.length > 0) {
          subs.slice(0, 5).forEach((s) => {
            notifList.push({
              id: `sub-${s.id}`,
              type: "substitution",
              title: "Proxy Substitution Assigned",
              description: `Proxy assigned: taking ${s.subject || "Class"} (${s.section || "Sec A"} - Room ${s.room || "Lab"}) on ${s.date || "Scheduled Date"} (${s.slot || "Slot"}).`,
              timestamp: s.created_at
                ? new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recently",
              unread: false,
              actionTarget: "substitutions",
              badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
            });
          });
        }
      } catch (err) {
        console.warn("Could not fetch substitutions for notifications:", err);
      }

      // 3. Fetch newly registered faculty accounts from Supabase
      try {
        if (supabase) {
          const { data: faculties } = await supabase
            .from("faculty_profiles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(3);

          if (Array.isArray(faculties) && faculties.length > 0) {
            faculties.forEach((f) => {
              notifList.push({
                id: `fac-${f.id}`,
                type: "faculty",
                title: "Faculty Profile Active",
                description: `${f.teacher_name || "Faculty Member"} registered in ${f.department_name || f.department || "Academic Department"}.`,
                timestamp: f.created_at
                  ? new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Active",
                unread: false,
                actionTarget: "faculty",
                badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
              });
            });
          }
        }
      } catch {
        // Fallback
      }

      setNotifications(notifList);
      const unread = notifList.filter((n) => n.unread).length;
      if (onUpdateUnreadCount) onUpdateUnreadCount(unread);
    } catch {
      // Graceful handling
    } finally {
      setLoading(false);
    }
  }, [onUpdateUnreadCount]);

  // Real-time multi-table stream subscription & custom events
  useEffect(() => {
    fetchRealtimeNotifications();

    const unsubLeaves = subscribeToTable("leave_applications", () => {
      fetchRealtimeNotifications();
    });

    const unsubSubs = subscribeToTable("substitution_log", () => {
      fetchRealtimeNotifications();
    });

    const unsubFaculty = subscribeToTable("faculty_profiles", () => {
      fetchRealtimeNotifications();
    });

    const interval = setInterval(fetchRealtimeNotifications, 6000);
    return () => {
      clearInterval(interval);
      unsubLeaves();
      unsubSubs();
      unsubFaculty();
    };
  }, [fetchRealtimeNotifications]);

  if (!isOpen) return null;

  const handleAction = (item) => {
    if (onNavigate && item.actionTarget) {
      onNavigate(item.actionTarget);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );
    const unread = notifications.filter(
      (n) => n.unread && n.id !== item.id
    ).length;
    if (onUpdateUnreadCount) onUpdateUnreadCount(unread);
    onClose && onClose();
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (onUpdateUnreadCount) onUpdateUnreadCount(0);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in text-slate-100">
      <div className="card p-6 bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl space-y-4 mt-12 animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Real-Time Alerts
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} pending leave application${unreadCount > 1 ? "s" : ""} awaiting review`
                  : "All faculty requests up to date"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Live Feed List */}
        {loading ? (
          <div className="py-8 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Fetching live alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xl mx-auto mb-3 shadow-inner">
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-200">No active notifications</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              All faculty leave applications, biometric check-ins, and proxy assignments are up to date.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleAction(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group ${
                  item.unread
                    ? "bg-slate-800/95 border-amber-500/50 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                    : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {item.description}
                  </p>
                  <span className="text-[11px] text-amber-400 font-bold mt-2 inline-block group-hover:underline">
                    Review in {item.actionTarget.toUpperCase()} →
                  </span>
                </div>
                {item.unread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 mt-1 shadow-sm shadow-amber-400/50 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={markAllAsRead}
            className="text-[11px] text-slate-400 hover:text-white font-semibold transition-colors"
          >
            Mark all as read
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRealtimeNotifications}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
              title="Refresh alerts"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
