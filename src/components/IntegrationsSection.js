import { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function IntegrationsSection() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const testWebhook = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/n8n/test`, {
        event: "manual_test",
        payload: { message: "Test from Planify.exe UI" }
      });
      setStatus({ success: true, data: response.data });
    } catch (err) {
      setStatus({ success: false, error: err.response?.data?.detail || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 animate-scale-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-10h-9l1-8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">n8n Workflow Integration</h2>
          <p className="text-slate-400 text-sm mt-1">Automate teacher notifications, Excel exports, and cloud backups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Webhook Connectivity
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Planify.exe sends real-time payloads to your n8n instance whenever a timetable is generated, rescheduled, or saved. 
              Ensure <code className="bg-black/30 px-1.5 py-0.5 rounded text-violet-300">N8N_WEBHOOK_URL</code> is set in your backend <code className="bg-black/30 px-1.5 py-0.5 rounded text-violet-300">.env</code> file.
            </p>
            
            <button 
              onClick={testWebhook}
              disabled={loading}
              className="btn-gradient w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? "Testing Connection..." : "Test n8n Connection"}
              {!loading && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
            </button>

            {status && (
              <div className={`mt-4 p-4 rounded-xl border text-sm animate-slide-up ${status.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                <div className="font-bold mb-1">{status.success ? "✅ Connection Successful!" : "❌ Connection Failed"}</div>
                <pre className="text-[10px] overflow-x-auto bg-black/20 p-2 rounded mt-2">
                  {JSON.stringify(status.success ? status.data : status.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Automation Events</h3>
            <ul className="space-y-3">
              {[
                { event: "timetable.generated", desc: "Triggered on new schedule creation" },
                { event: "timetable.rescheduled", desc: "Triggered on proxy or slot changes" },
                { event: "timetable.saved", desc: "Triggered on Cloud Save" }
              ].map((item, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <div className="text-xs font-bold text-violet-300">{item.event}</div>
                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card border-violet-500/20 bg-violet-500/5 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-violet-300 mb-2">Effortless Delivery</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              With the newly added teacher contact info, your n8n workflow can now:
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "Generate individual Excel files per teacher.",
                "Send PDF schedules via Email/WhatsApp.",
                "Sync section schedules with Google Calendar.",
                "Push analytics to an Admin Dashboard."
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">Coming Soon: Custom JSON Payload Builder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
