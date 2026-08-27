import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "./common/BrandLogo";
import { useAcademic } from "../context/AcademicContext";
import { verifyDeveloperKey } from "../utils/devAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAsDeveloper } = useAcademic();
  const [developerPassword, setDeveloperPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleDeveloperLogin = (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMessage("");

    const keyToVerify = developerPassword.trim();
    if (!keyToVerify) {
      setError("Please enter the developer password to proceed.");
      return;
    }

    if (verifyDeveloperKey(keyToVerify)) {
      setLoading(true);
      setSuccessMessage("Developer Password verified! Logging in as plannify_developers...");
      setTimeout(() => {
        loginAsDeveloper("plannify_developers");
        navigate("/dashboard", { replace: true });
      }, 500);
    } else {
      setError("Invalid Developer Password. Access is restricted exclusively to plannify_developers during active development.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Background Mesh & Glow */}
      <div className="glow-mesh" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[960px] grid lg:grid-cols-12 gap-0 overflow-hidden bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl">

        {/* LEFT COLUMN: BRAND HERO (5 cols) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 border-r border-indigo-500/20 dark:border-slate-800 text-white relative overflow-hidden">
          {/* Subtle Ambient Pattern / Glow */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-500/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="mb-8">
              <BrandLogo size="lg" isWarm={false} textColor="text-white" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-3">
              <span>🔒 Developer Access Only</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white mb-3 leading-snug font-display">
              Plannify Academic <br />
              <span className="text-amber-300">Intelligent Core</span>
            </h1>
            <p className="text-indigo-100/90 text-xs leading-relaxed font-medium">
              Next-generation automated university scheduling, constraint satisfaction, and operational analytics.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/10 text-xs text-white relative z-10">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px]">
                <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Intellectual Property Rights</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Held & Engineered exclusively by <strong>plannify_developers</strong>. All architecture and solvers are proprietary.
              </p>
            </div>

            <div className="flex items-center gap-3 text-slate-300 text-[11px] pl-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Developer Workspace Gate Active</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DEVELOPER ACCESS PORTAL (7 cols) */}
        <div className="lg:col-span-7 p-7 lg:p-10 flex flex-col justify-center space-y-5">

          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center justify-between mb-1 pb-4 border-b border-slate-200 dark:border-slate-800">
            <BrandLogo size="md" isWarm={false} />
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Dev Mode
            </span>
          </div>

          {/* ── MANDATORY INTELLECTUAL PROPERTY & ACTIVE DEVELOPMENT BANNER ── */}
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/15 border-2 border-amber-500/40 dark:border-amber-400/40 shadow-lg shadow-amber-500/5 backdrop-blur-md animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    Active Development Notice
                  </span>
                  <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300">
                    plannify_developers
                  </span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                  This Software or app is under development, and developer has only access to go through it, as it is the intellectual property held by <span className="text-amber-700 dark:text-amber-300 font-black underline decoration-amber-500/60">plannify_developers</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Header & Title */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Developer Authentication
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Developer Access Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter the developer password to access core timetable solvers, faculty operations, and system controls.
            </p>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3.5 rounded-xl font-semibold border text-xs bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 animate-slide-down flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl font-semibold border text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 animate-slide-down flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* DEVELOPER LOGIN FORM */}
          <form onSubmit={handleDeveloperLogin} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Developer Password *
                </label>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">plannify_developers</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={developerPassword}
                  onChange={(e) => setDeveloperPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-amber-400/50 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                  placeholder="Enter Developer Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-1 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 text-white font-black text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              )}
              <span>🛡️ Unlock Developer Workspace (plannify_developers)</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
