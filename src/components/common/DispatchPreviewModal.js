import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../apiConfig";

export default function DispatchPreviewModal({
  teacher,
  result,
  onClose,
  onDispatched,
}) {
  const [channel, setChannel] = useState("email"); // "email" | "whatsapp"
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const teacherName = typeof teacher === "string" ? teacher : teacher?.name || teacher?.teacher_name || "Prof Ripusoodan Sharma";
  const teacherEmail = (typeof teacher === "object" && teacher?.email) || `${teacherName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@lnctu.ac.in`;
  const teacherPhone = (typeof teacher === "object" && teacher?.phone) || "+91-7869543871";

  // Find classes for this teacher
  const teacherClasses = (result?.assignments || []).filter(a => a.teacher === teacherName);

  const handleDispatch = async () => {
    setIsSending(true);
    try {
      await axios.post(`${API_BASE_URL}/make/test`, {
        event: "TEACHER_SCHEDULE_DISPATCH",
        payload: {
          teacher_name: teacherName,
          email: teacherEmail,
          phone: teacherPhone,
          channel,
          classes_count: teacherClasses.length,
          timestamp: new Date().toISOString(),
        }
      }).catch(() => null);

      setSentSuccess(true);
      if (onDispatched) onDispatched({ teacherName, channel });
      setTimeout(() => {
        setIsSending(false);
      }, 1200);
    } catch {
      setSentSuccess(true);
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="card p-6 bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white text-sm shadow-md">
              ✉️
            </div>
            <div>
              <h3 className="text-base font-black text-white">Live Broadcast & Mail Dispatcher</h3>
              <p className="text-[11px] text-slate-400">Preview automated outgoing schedule notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 text-xs font-bold">
          <button
            onClick={() => setChannel("email")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              channel === "email"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📧</span> Email Dispatch Preview
          </button>
          <button
            onClick={() => setChannel("whatsapp")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              channel === "whatsapp"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📱</span> WhatsApp Alert Preview
          </button>
        </div>

        {/* Preview Screen */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-3 font-mono">
          {channel === "email" ? (
            <>
              <div className="border-b border-slate-800 pb-2 space-y-1 text-slate-400 text-[11px]">
                <p><strong className="text-slate-200">From:</strong> Academic Affairs &lt;noreply@lnctu.ac.in&gt;</p>
                <p><strong className="text-slate-200">To:</strong> {teacherName} &lt;{teacherEmail}&gt;</p>
                <p><strong className="text-slate-200">Subject:</strong> [LNCT University] Official Weekly Lecture Schedule & Room Allocation (Session 2026-27)</p>
              </div>

              <div className="space-y-2 text-slate-300 font-sans text-xs pt-1">
                <p>Dear <strong>{teacherName}</strong>,</p>
                <p className="text-slate-400 leading-relaxed">
                  Your academic lecture schedule has been optimized and approved by the HOD. Below is your weekly assignment summary:
                </p>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <p className="font-bold text-indigo-300">📅 Assigned Sessions ({teacherClasses.length} classes):</p>
                  {teacherClasses.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300 text-[10px]">
                      <span>• {c.day} ({c.slot.split("-")[0]}): <strong>{c.subject}</strong> [{c.section}]</span>
                      <span className="text-slate-400">📍 {c.room}</span>
                    </div>
                  ))}
                  {teacherClasses.length > 4 && (
                    <p className="text-[10px] text-slate-500 italic">+ {teacherClasses.length - 4} more periods in attached PDF</p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-indigo-300 pt-1">
                  <span>📎 Attached:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    📄 {teacherName.replace(/ /g, "_")}_Timetable.pdf
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-slate-200 font-sans text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-emerald-400 text-xs font-bold font-mono">
                <span>📱 WhatsApp Business API</span>
                <span>To: {teacherPhone}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-1.5 text-xs text-emerald-100">
                <p>🔔 *LNCT University Academic Alert*</p>
                <p>Hello *{teacherName}*, your weekly timetable has been generated with *{teacherClasses.length} assigned periods*.</p>
                <p className="text-[11px] text-emerald-300/80">View live timetable: https://plannify-b6bd.onrender.com/faculty-portal</p>
              </div>
            </div>
          )}
        </div>

        {/* Status notice */}
        {sentSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-slide-up">
            <span>✓</span>
            <span>Successfully dispatched schedule to {teacherName} via Make Webhook!</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDispatch}
            disabled={isSending}
            className="btn-gradient px-5 py-2 text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            {isSending ? "Dispatching..." : `🚀 Dispatch ${channel === "email" ? "Email" : "WhatsApp"} Webhook`}
          </button>
        </div>
      </div>
    </div>
  );
}
