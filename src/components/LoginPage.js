import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../apiConfig";
import BrandLogo from "./common/BrandLogo";
import { useAcademic } from "../context/AcademicContext";
import {
  verifyDeveloperKey,
  isDeveloperEmail,
  DEV_RESTRICTION_MESSAGE,
  DEV_RESTRICTION_TITLE
} from "../utils/devAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAsDeveloper } = useAcademic();
  const [portalRole, setPortalRole] = useState("developer"); // "developer" | "admin" | "teacher"
  const [developerKey, setDeveloperKey] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const department = "Computer Applications";
  const [designation, setDesignation] = useState("Assistant Professor");
  const [employeeId, setEmployeeId] = useState(`EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDevKey, setShowDevKey] = useState(false);

  useEffect(() => {
    // 1. Detect if arriving from a Supabase password recovery email link
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      setIsRecoveryMode(true);
      setIsForgotPassword(false);
      setIsSignUp(false);
    }

    // 2. Listen for Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setIsForgotPassword(false);
        setIsSignUp(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDeveloperKeyLogin = (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMessage("");

    const keyToVerify = developerKey.trim();
    if (!keyToVerify) {
      setError("Please enter the Developer Password to proceed.");
      return;
    }

    if (verifyDeveloperKey(keyToVerify)) {
      setLoading(true);
      setSuccessMessage("Developer Password verified! Logging in as Ut3av & SujaL...");
      setTimeout(() => {
        loginAsDeveloper("Ut3av & SujaL");
        navigate("/dashboard", { replace: true });
      }, 500);
    } else {
      setError("Invalid Developer Password. Access is restricted exclusively to Ut3av & SujaL during active development.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (!email.trim()) {
        throw new Error("Please enter your registered email address.");
      }

      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetError) throw resetError;

      setSuccessMessage("Password reset link sent! Please check your email inbox (and spam/junk folder).");
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please verify your email address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccessMessage("Password successfully updated! Redirecting to your workspace...");
      setTimeout(() => {
        setIsRecoveryMode(false);
        setIsForgotPassword(false);
        if (typeof window !== "undefined" && window.history?.replaceState) {
          window.history.replaceState(null, null, window.location.pathname);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to update password. The reset link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      // 1. Check if trying to access Developer Portal directly
      if (portalRole === "developer") {
        if (developerKey && verifyDeveloperKey(developerKey)) {
          loginAsDeveloper("Ut3av & SujaL");
          setSuccessMessage("Developer Master Key verified. Entering workspace...");
          setTimeout(() => navigate("/dashboard", { replace: true }), 400);
          return;
        } else {
          throw new Error("Invalid Developer Passcode. Only the developers (Ut3av & SujaL) have access to this software.");
        }
      }

      // 2. Gate Registration / Sign Up
      if (isSignUp) {
        const isDevAuthorized = verifyDeveloperKey(developerKey) || isDeveloperEmail(email);
        
        if (!isDevAuthorized) {
          throw new Error(
            "Access Restricted: This software is under active development, and developer has only access to go through it, as it is the intellectual property held by Ut3av & SujaL."
          );
        }

        const empId = employeeId || `EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`;
        const teacherName = name || email.split('@')[0];

        // Supabase Auth Signup
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              role: portalRole,
              name: teacherName,
              phone: phone || "+91-9876543210",
              department: department,
              designation: designation,
              employee_id: empId,
            }
          }
        });
        if (signUpError) throw signUpError;
        if (data?.user?.identities?.length === 0) {
          throw new Error("This email is already registered.");
        }

        if (portalRole === "teacher") {
          try {
            await axios.post(`${API_BASE_URL}/faculty/sync-account`, {
              user_id: data?.user?.id,
              teacher_name: teacherName,
              name: teacherName,
              email: email,
              phone: phone || "+91-9876543210",
              employee_id: empId,
              designation: designation || "Assistant Professor",
              employment_type: "full-time",
              status: "active",
              qualification: "M.Tech / Ph.D",
              department: department,
              department_name: department
            });
          } catch (apiErr) {
            console.warn("Auto-register faculty in backend database:", apiErr);
          }
        }

        setSuccessMessage("Developer account created & verified! You can now sign in.");
      } else {
        // 3. Gate Sign In
        const isDevKeyProvided = developerKey && verifyDeveloperKey(developerKey);
        const isDevEmail = isDeveloperEmail(email);

        // If developer credentials entered in standard form, unlock developer mode immediately
        if (isDevKeyProvided || (isDevEmail && password === "dev2026")) {
          loginAsDeveloper("Ut3av & SujaL");
          setSuccessMessage("Developer access verified. Entering workspace...");
          setTimeout(() => navigate("/dashboard", { replace: true }), 400);
          return;
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // If auth fails and not developer, display development notice
          if (!isDevEmail) {
            throw new Error(
              "Access Restricted: This software is under development, and developer has only access to go through it, as it is the intellectual property held by Ut3av & SujaL."
            );
          }
          throw signInError;
        }

        // Auto-enrich user metadata if missing name or role
        if (signInData?.user) {
          const userMeta = signInData.user.user_metadata || {};
          let resolvedName = userMeta.name || userMeta.teacher_name || userMeta.full_name || name;
          let resolvedDept = userMeta.department || userMeta.department_name || department;
          let resolvedDesig = userMeta.designation || designation;
          let resolvedEmpId = userMeta.employee_id || employeeId;
          let resolvedPhone = userMeta.phone || phone;

          if (!resolvedName) {
            resolvedName = email.split('@')[0];
          }

          const effectiveRole = userMeta.role || portalRole;

          // If developer email authenticated via Supabase, set full developer rights
          if (isDeveloperEmail(email) || effectiveRole === "developer") {
            loginAsDeveloper(resolvedName || "Ut3av & SujaL");
            navigate("/dashboard", { replace: true });
            return;
          }

          // Navigate cleanly to appropriate portal
          const targetRole = signInData?.user?.user_metadata?.role || portalRole;
          if (targetRole === "teacher" || targetRole === "Faculty" || targetRole === "Teacher") {
            navigate("/portal", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Background Mesh & Glow */}
      <div className="glow-mesh" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[1060px] grid lg:grid-cols-12 gap-0 overflow-hidden bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl">

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
              <span>🔒 Private Development Build</span>
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
                Held & Engineered exclusively by <strong>Ut3av & SujaL</strong>. All architecture and solvers are proprietary.
              </p>
            </div>

            <div className="flex items-center gap-3 text-slate-300 text-[11px] pl-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Developer Access Mode Active</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTH, DEVELOPMENT BANNER & CONTROLS (7 cols) */}
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
                    Ut3av & SujaL
                  </span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                  This Software or app is under development, and developer has only access to go through it, as it is the intellectual property held by <span className="text-amber-700 dark:text-amber-300 font-black underline decoration-amber-500/60">Ut3av & SujaL</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Header & Title */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {isRecoveryMode
                  ? "Security Recovery"
                  : isForgotPassword
                  ? "Account Assistance"
                  : isSignUp
                  ? "Developer Registration"
                  : "Access Portal"}
              </span>
              <button
                type="button"
                onClick={() => setPortalRole("developer")}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>🛡️ Developer Fast-Entry</span>
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {isRecoveryMode
                ? "Set New Password"
                : isForgotPassword
                ? "Reset Your Password"
                : isSignUp
                ? "Create Identity (Dev Verification Required)"
                : portalRole === "developer"
                ? "Developer Gate (Ut3av & SujaL)"
                : "Sign In to Plannify.exe"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {portalRole === "developer"
                ? "Authenticated developer access for system architecture, constraint solving, & testing."
                : isSignUp
                ? "Public registrations are locked during active development. Developer passcode required."
                : "Select portal to proceed. Unauthorized access is restricted during development."}
            </p>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3.5 rounded-xl font-semibold border text-xs bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 animate-slide-down flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div className="space-y-1">
                <span>{error}</span>
                {portalRole !== "developer" && (
                  <button
                    type="button"
                    onClick={() => { setPortalRole("developer"); setError(""); }}
                    className="block text-indigo-600 dark:text-indigo-400 font-bold hover:underline mt-1"
                  >
                    Switch to Developer Access Tab (Ut3av & SujaL) →
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl font-semibold border text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 animate-slide-down flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW 1: RECOVERY / NEW PASSWORD FORM */}
          {isRecoveryMode ? (
            <form onSubmit={handleSetNewPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter at least 6 characters"
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

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-1 transition-colors"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
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
                className="btn-primary w-full py-3 text-xs font-bold gap-2 justify-center shadow-lg shadow-indigo-500/20 mt-2"
              >
                {loading ? "Updating Credentials..." : "Set New Password & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setIsRecoveryMode(false); setIsForgotPassword(false); setError(""); setSuccessMessage(""); }}
                className="w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pt-2"
              >
                ← Return to Sign In
              </button>
            </form>
          ) : isForgotPassword ? (
            /* VIEW 2: FORGOT PASSWORD REQUEST FORM */
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Registered Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. developer@plannify.dev or admin@lnctu.ac.in"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  We will send a secure Supabase authentication link allowing you to choose a new password.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-xs font-bold gap-2 justify-center shadow-lg shadow-indigo-500/20 mt-2"
              >
                {loading ? "Sending Recovery Link..." : "Send Password Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(""); setSuccessMessage(""); }}
                className="w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pt-2"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            /* VIEW 3: STANDARD & DEVELOPER PORTAL SECTIONS */
            <>
              {/* THREE PORTAL SECTIONS SWITCHER */}
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {/* Developer Portal Tab */}
                <button
                  type="button"
                  onClick={() => { setPortalRole("developer"); setError(""); }}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "developer"
                      ? "bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border-amber-500 text-slate-900 dark:text-white shadow-md shadow-amber-500/10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Developer
                    </span>
                    {portalRole === "developer" && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-tight line-clamp-1">
                    Ut3av & SujaL (Full Access)
                  </p>
                </button>

                {/* Admin Tab */}
                <button
                  type="button"
                  onClick={() => { setPortalRole("admin"); setError(""); }}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "admin"
                      ? "bg-white dark:bg-indigo-500/15 border-indigo-500 text-slate-900 dark:text-white shadow-md shadow-indigo-600/10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Admin
                    </span>
                    {portalRole === "admin" && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-tight line-clamp-1">
                    Institutional Operations
                  </p>
                </button>

                {/* Teacher Tab */}
                <button
                  type="button"
                  onClick={() => { setPortalRole("teacher"); setError(""); }}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "teacher"
                      ? "bg-white dark:bg-indigo-500/15 border-indigo-500 text-slate-900 dark:text-white shadow-md shadow-indigo-600/10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Faculty
                    </span>
                    {portalRole === "teacher" && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-tight line-clamp-1">
                    Personal Schedule
                  </p>
                </button>
              </div>

              {/* ── PORTAL VIEW A: DEDICATED DEVELOPER ACCESS PANEL (Ut3av & SujaL) ── */}
              {portalRole === "developer" ? (
                <div className="space-y-4 text-xs animate-fade-in">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-extrabold text-amber-700 dark:text-amber-300">
                          Developer Access Portal (Ut3av & SujaL)
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        IP Owners
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      This software is currently in private development. Enter the developer password to access all solver engines, faculty systems, and administrative controls.
                    </p>
                  </div>

                  {/* ENTER DEVELOPER PASSWORD FORM */}
                  <form onSubmit={handleDeveloperKeyLogin} className="space-y-3.5 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          Developer Master Password *
                        </label>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Ut3av & SujaL</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showDevKey ? "text" : "password"}
                          required
                          value={developerKey}
                          onChange={(e) => setDeveloperKey(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-amber-400/50 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                          placeholder="Enter Developer Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDevKey(!showDevKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-1 transition-colors"
                          title={showDevKey ? "Hide password" : "Show password"}
                        >
                          {showDevKey ? (
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
                      <span>🛡️ Unlock Developer Workspace (Ut3av & SujaL)</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* ── PORTAL VIEW B: ADMIN & TEACHER LOGIN / SIGNUP WITH DEVELOPER GATING ── */
                <form onSubmit={handleAuth} className="space-y-3.5 text-xs">
                  {isSignUp && (
                    <>
                      {/* Notice that signup is restricted */}
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>New account creation is restricted to developers during active development.</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Ut3av / Dr. Arvind Kumar"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone / Mobile *</label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="+91-9876543210"
                          />
                        </div>
                      </div>

                      {/* Developer Authorization Key requirement on signup */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            Developer Authorization Key *
                          </label>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Required for registration</span>
                        </div>
                        <input
                          type="password"
                          value={developerKey}
                          onChange={(e) => setDeveloperKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-amber-400/40 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="Enter developer key (e.g. UT3AV-SUJAL-DEV)"
                        />
                      </div>

                      {portalRole === "teacher" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                            <select
                              value={designation}
                              onChange={(e) => setDesignation(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Professor">Professor</option>
                              <option value="Associate Professor">Associate Professor</option>
                              <option value="Assistant Professor">Assistant Professor</option>
                              <option value="Lecturer">Lecturer</option>
                              <option value="Lab Instructor">Lab Instructor</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="font-bold text-slate-700 dark:text-slate-300">Employee ID</label>
                              <span className="text-[10px] text-slate-500 font-mono">ID</span>
                            </div>
                            <input
                              type="text"
                              value={employeeId}
                              onChange={(e) => setEmployeeId(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="EMP-LNCT-1001"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={portalRole === "admin" ? "ut3av@plannify.dev or admin@planify.edu" : "faculty@planify.edu"}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">Password *</label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => { setIsForgotPassword(true); setIsSignUp(false); setError(""); setSuccessMessage(""); }}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="••••••••"
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
                    className="btn-primary w-full py-3 text-xs font-bold gap-2 justify-center shadow-lg shadow-indigo-500/20 mt-2"
                  >
                    {loading ? "Authenticating..." : (isSignUp ? `Initialize ${portalRole === 'admin' ? 'Admin' : 'Faculty'} Account` : `Sign In to ${portalRole === 'admin' ? 'Admin OS' : 'Faculty Portal'}`)}
                  </button>

                  <div className="pt-2 flex flex-col gap-2 text-center text-xs">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); setError(""); setSuccessMessage(""); }}
                      className="font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {isSignUp ? "Already registered? Sign In" : "Need an account? Register new identity"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPortalRole("developer"); setError(""); }}
                      className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline pt-1"
                    >
                      🛡️ Are you Ut3av or SujaL? Enter Developer Fast-Access Mode →
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
