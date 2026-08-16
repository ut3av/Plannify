import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export default function LogsSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("automation_logs")
        .select(`
          *,
          teachers (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    // Optional: Real-time subscription to logs
    const subscription = supabase
      .channel("automation_logs_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "automation_logs" }, payload => {
        setLogs(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchLogs]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "success": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "failed": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
  };

  return (
    <div className="animate-scale-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10M18 20V4M6 20v-6" />
              </svg>
            </div>
            Automation Mission Control
          </h2>
          <p className="text-slate-400 text-sm mt-1 ml-13">Monitor real-time Make workflow executions and delivery reports.</p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 transition-all"
        >
          <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

      <div className="glass-card overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Event</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Teacher</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Channel</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-500 italic text-sm">
                    {loading ? "Establishing connection to logs..." : "No automation logs found. Trigger a distribution to see events here."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors">
                        {log.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-300">
                        {log.teachers?.name || "System / Bulk"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                          {log.delivery_channel || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
