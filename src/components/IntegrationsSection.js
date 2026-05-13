import { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function IntegrationsSection() {
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [status, setStatus] = useState(null);
  const [distributeStatus, setDistributeStatus] = useState(null);

  const testWebhook = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/n8n/test`, {
        event: "manual_test",
        payload: { message: "Test from Planify.exe Premium UI" }
      });
      setStatus({ success: true, data: response.data });
    } catch (err) {
      setStatus({ success: false, error: err.response?.data?.detail || err.message });
    } finally {
      setLoading(false);
    }
  };

  const distributeTimetables = async () => {
    setDistributing(true);
    setDistributeStatus(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/n8n/email-all`);
      setDistributeStatus({ success: true, message: "Bulk distribution triggered! n8n is now mailing all teachers." });
    } catch (err) {
      setDistributeStatus({ success: false, error: err.response?.data?.detail || "Could not reach the distribution engine." });
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="animate-scale-in space-y-6">
      {/* Hero Section */}
      <div className="glass-card relative overflow-hidden p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900/40 to-slate-800/40 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/20 shrink-0">
            <svg className="w-10 h-10 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-10h-9l1-8z" />
            </svg>
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h2 className="text-3xl font-black tracking-tight text-white">n8n Automation</h2>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Engine</span>
            </div>
            <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
              Bridge the gap between scheduling and delivery. Automatically notify teachers via Email or WhatsApp, generate individual Excel reports, and sync your data with 2000+ apps.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={testWebhook}
              disabled={loading || distributing}
              className="btn-outline px-6 py-4 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <span className="flex items-center gap-2 text-slate-300">
                {loading ? "Verifying..." : "Ping Instance"}
              </span>
            </button>
            <button 
              onClick={distributeTimetables}
              disabled={loading || distributing}
              className="btn-gradient px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <span className="flex items-center gap-2">
                {distributing ? "Distributing..." : "Distribute Timetables"}
                {!distributing && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
              </span>
            </button>
          </div>
        </div>
        
        {distributeStatus && (
          <div className={`mt-6 p-4 rounded-xl border animate-slide-up text-sm font-bold flex items-center gap-3 ${distributeStatus.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
             <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               {distributeStatus.success ? <path d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01 9 11.01" /> : <path d="M18 6L6 18 M6 6l12 12" />}
             </svg>
             {distributeStatus.success ? distributeStatus.message : distributeStatus.error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Status Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Webhook Status
          </h3>
          
          {!status ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-10h-9l1-8z" /></svg>
              </div>
              <p className="text-slate-500 text-sm font-medium italic">No test performed yet. Click 'Ping n8n Instance' to verify your connection.</p>
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border transition-all animate-slide-up ${status.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {status.success ? <path d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01 9 11.01" /> : <path d="M18 6L6 18 M6 6l12 12" />}
                    </svg>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${status.success ? "text-emerald-300" : "text-red-300"}`}>{status.success ? "Connection Established" : "Service Unreachable"}</div>
                    <div className="text-xs text-slate-500 font-medium">Verified at {new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 overflow-x-auto border border-white/5">
                <pre className="text-[11px] font-mono text-slate-400 leading-relaxed">
                  {JSON.stringify(status.success ? status.data : status.error, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02]">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Active Triggers</h3>
            <div className="space-y-3">
              {[
                { label: "Timetable Generated", color: "text-emerald-400" },
                { label: "Manual Reschedule", color: "text-amber-400" },
                { label: "Cloud Save Sync", color: "text-blue-400" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-xs font-bold text-slate-300">{item.label}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${item.color}`}>Enabled</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-[1.5rem] border border-violet-500/20 bg-violet-500/5">
            <h3 className="text-sm font-bold text-violet-300 uppercase tracking-widest mb-4">Pro Tip</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the <span className="text-violet-200">n8n_integration_guide.md</span> in your root folder to learn how to build individual teacher schedules from the raw system payload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
