import { useCallback, useEffect, useState } from "react";
import axios from "axios";

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return "Could not reach the n8n integration endpoint.";
}

export default function N8nIntegration({ apiBaseUrl }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${apiBaseUrl}/n8n/status`);
      setStatus(response.data);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const sendTest = async () => {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const response = await axios.post(`${apiBaseUrl}/n8n/test`, {
        event: "manual_test",
        payload: {
          source: "admin_dashboard",
          generated_at: new Date().toISOString(),
        },
      });
      if (response.data.delivered) {
        setMessage("Test event delivered to n8n successfully.");
      } else {
        setMessage(response.data.message || "n8n webhook is not enabled yet.");
      }
      await loadStatus();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="glass-card p-6 animate-scale-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Automation
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            Smart Proxy Escalation Workflow
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            When a teacher is unexpectedly marked absent, Planify.exe triggers an automated n8n pipeline. 
            It selects the optimal proxy via Groq AI and dispatches interactive WhatsApp approval requests via Twilio.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="btn-outline px-4 py-2 text-sm"
            onClick={loadStatus}
            disabled={loading || testing}
          >
            {loading ? "Checking..." : "Refresh"}
          </button>
          <button
            className="btn-gradient px-5 py-2 text-sm"
            onClick={sendTest}
            disabled={loading || testing}
          >
            {testing ? "Sending..." : "Send Test Event"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Status
          </p>
          <p className={`mt-2 text-lg font-bold ${status?.enabled ? "text-emerald-300" : "text-amber-300"}`}>
            {status?.enabled ? "Enabled" : "Not Configured"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Webhook Host
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-200">
            {status?.webhook_host || "Waiting for .env"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Events
          </p>
          <p className="mt-2 text-lg font-bold text-violet-300">
            {status?.events?.length || 0}
          </p>
        </div>
      </div>

      {/* Interactive Workflow Diagram */}
      <div className="mt-8 pt-8 border-t border-white/10">
        <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Live Pipeline Execution</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
            {testing && <div className="h-full bg-emerald-500 w-1/3 animate-[slide_1.5s_ease-in-out_infinite] shadow-[0_0_10px_#10b981]"></div>}
          </div>

          {/* Node 1: Planify Trigger */}
          <div className="glass-card p-4 rounded-xl border border-violet-500/30 bg-slate-900 w-full md:w-1/4 text-center z-10 shadow-lg shadow-violet-500/10 relative">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <p className="text-xs font-bold text-white mb-1">Teacher Sick Leave</p>
            <p className="text-[10px] text-slate-400">Webhook Triggered</p>
          </div>

          <svg className="w-6 h-6 text-slate-600 md:-rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>

          {/* Node 2: AI Logic */}
          <div className="glass-card p-4 rounded-xl border border-blue-500/30 bg-slate-900 w-full md:w-1/4 text-center z-10 shadow-lg shadow-blue-500/10 relative">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-400 font-bold italic text-lg pr-0.5">7</span>
            </div>
            <p className="text-xs font-bold text-white mb-1">7Seas AI Routing</p>
            <p className="text-[10px] text-slate-400">Selects Best Proxy</p>
          </div>

          <svg className="w-6 h-6 text-slate-600 md:-rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>

          {/* Node 3: WhatsApp Action */}
          <div className={`glass-card p-4 rounded-xl border ${message ? 'border-emerald-500 shadow-emerald-500/20 bg-emerald-500/5' : 'border-emerald-500/30 bg-slate-900'} w-full md:w-1/4 text-center z-10 shadow-lg relative transition-colors duration-500`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${message ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </div>
            <p className="text-xs font-bold text-white mb-1">WhatsApp Sent</p>
            <p className="text-[10px] text-slate-400">{message ? 'Delivery Confirmed' : 'Awaiting Trigger'}</p>
          </div>
        </div>

        {message && (
          <div className="mt-8 mx-auto max-w-sm rounded-2xl bg-[#075e54] p-4 text-white shadow-xl animate-fade-in-up">
             <div className="text-[10px] text-white/70 mb-2 flex items-center gap-1">
               <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
               Automated Message
             </div>
             <p className="text-sm">
               "Hello! A sudden absence has been reported. Planify AI suggests you as the optimal proxy for <strong>Data Structures</strong> in <strong>Room 101</strong> at <strong>10:30 AM</strong>. Reply YES to accept."
             </p>
          </div>
        )}
      </div>
    </section>
  );
}
