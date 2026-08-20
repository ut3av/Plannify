import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../apiConfig";
import BrandLogo from "./common/BrandLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const [portalRole, setPortalRole] = useState("teacher"); // "admin" | "teacher"
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
      if (isSignUp) {
        const empId = employeeId || `EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`;
        const teacherName = name || email.split('@')[0];

        // 1. Supabase Auth Signup with complete metadata
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

        // 2. Auto-Registration Hook: Seamlessly insert into Faculty Directory & database
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

          // 3. Auto-sync teacher into active cloud timetable state
          try {
            const { data: cloudData } = await supabase
              .from('timetable_state')
              .select('*')
              .eq('id', 'draft')
              .single();

            let tList = [];
            if (cloudData) {
              const rawTeachers = cloudData.teachers ?? cloudData.room;
              if (rawTeachers) {
                try {
                  tList = typeof rawTeachers === 'string' ? JSON.parse(rawTeachers) : rawTeachers;
                } catch {
                  tList = [];
                }
              }
            }
            if (!Array.isArray(tList)) tList = [];
            if (!tList.some(t => (t.name || t)?.trim().toLowerCase() === teacherName.trim().toLowerCase())) {
              tList.push({
                name: teacherName,
                department: department || "Computer Applications",
                phone: phone || "+91-9876543210",
                email: email,
                employee_id: empId,
                designation: designation || "Assistant Professor",
                free_periods: 1
              });
              await supabase
                .from('timetable_state')
                .upsert({
                  id: 'draft',
                  teachers: tList,
                  updated_at: new Date().toISOString()
                });
            }
          } catch (cloudErr) {
            console.warn("Cloud state sync for new faculty:", cloudErr);
          }
        }

        setSuccessMessage("Faculty account created & seamlessly registered with the University Faculty Directory! You can now sign in.");
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Auto-enrich user metadata if missing name or role
        if (signInData?.user) {
          const userMeta = signInData.user.user_metadata || {};
          let resolvedName = userMeta.name || userMeta.teacher_name || userMeta.full_name || name;
          let resolvedDept = userMeta.department || userMeta.department_name || department;
          let resolvedDesig = userMeta.designation || designation;
          let resolvedEmpId = userMeta.employee_id || employeeId;
          let resolvedPhone = userMeta.phone || phone;

          // If metadata is sparse, cross-reference registered faculty_profiles in database
          if (!resolvedName || !userMeta.department || !userMeta.employee_id) {
            try {
              const { data: dbProfile } = await supabase
                .from('faculty_profiles')
                .select('teacher_name, department, designation, employee_id, phone')
                .eq('email', email)
                .maybeSingle();

              if (dbProfile) {
                if (!resolvedName && dbProfile.teacher_name) resolvedName = dbProfile.teacher_name;
                if (!resolvedDept && dbProfile.department) resolvedDept = dbProfile.department;
                if (!resolvedDesig && dbProfile.designation) resolvedDesig = dbProfile.designation;
                if (!resolvedEmpId && dbProfile.employee_id) resolvedEmpId = dbProfile.employee_id;
                if (!resolvedPhone && dbProfile.phone) resolvedPhone = dbProfile.phone;
              }
            } catch (pErr) {
              // Ignore fallback
            }
          }

          if (!resolvedName) {
            resolvedName = email.split('@')[0];
          }

          const effectiveRole = userMeta.role || portalRole;

          // Update Supabase user metadata if any key field was missing
          if (!userMeta.role || !userMeta.name || !userMeta.employee_id) {
            await supabase.auth.updateUser({
              data: {
                role: effectiveRole,
                name: resolvedName,
                department: resolvedDept || "Computer Applications",
                designation: resolvedDesig || "Assistant Professor",
                employee_id: resolvedEmpId || `EMP-LNCT-${Math.abs(resolvedName.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000) + 1000}`,
                phone: resolvedPhone || "+91-9876543210",
              }
            }).catch(() => null);
          }

          // Auto-sync signed-in teacher into cloud timetable state if role is teacher
          if (effectiveRole === "teacher" || effectiveRole === "Faculty" || effectiveRole === "Teacher") {
            try {
              const teacherName = resolvedName;
              const { data: cloudData } = await supabase
                .from('timetable_state')
                .select('*')
                .eq('id', 'draft')
                .single();

              let tList = [];
              if (cloudData) {
                const rawTeachers = cloudData.teachers ?? cloudData.room;
                if (rawTeachers) {
                  try {
                    tList = typeof rawTeachers === 'string' ? JSON.parse(rawTeachers) : rawTeachers;
                  } catch {
                    tList = [];
                  }
                }
              }
              if (!Array.isArray(tList)) tList = [];
              if (!tList.some(t => (t.name || t)?.trim().toLowerCase() === teacherName.trim().toLowerCase())) {
                tList.push({
                  name: teacherName,
                  department: resolvedDept || "Computer Applications",
                  phone: resolvedPhone || "+91-9876543210",
                  email: signInData.user.email || email,
                  employee_id: resolvedEmpId || `EMP-LNCT-${Math.abs(teacherName.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000) + 1000}`,
                  designation: resolvedDesig || "Assistant Professor",
                  free_periods: 1
                });
                await supabase
                  .from('timetable_state')
                  .upsert({
                    id: 'draft',
                    teachers: tList,
                    updated_at: new Date().toISOString()
                  });
              }
            } catch (cloudErr) {
              console.warn("Cloud state sync for signing-in faculty:", cloudErr);
            }
          }
        }

        // Navigate cleanly to appropriate portal
        const targetRole = signInData?.user?.user_metadata?.role || portalRole;
        if (targetRole === "teacher" || targetRole === "Faculty" || targetRole === "Teacher") {
          navigate("/portal", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
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
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[1020px] grid lg:grid-cols-12 gap-0 overflow-hidden bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl">

        {/* LEFT COLUMN: BRAND HERO (5 cols) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 border-r border-indigo-500/20 dark:border-slate-800 text-white relative overflow-hidden">
          {/* Subtle Ambient Pattern / Glow */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 dark:bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-violet-400/15 dark:bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="mb-8">
              <BrandLogo size="lg" isWarm={false} textColor="text-white" />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white mb-3 leading-snug font-display">
              Smart Academic <br />
              <span className="text-amber-300 dark:text-indigo-300">Operations Platform</span>
            </h1>
            <p className="text-indigo-100/90 dark:text-slate-300 text-xs leading-relaxed font-medium">
              University-grade automated scheduling, real-time timetable optimization, and operational faculty analytics.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/20 dark:border-slate-800 text-xs text-white relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-emerald-500/20 text-white dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="font-semibold text-white">Google OR-Tools Constraint Solver</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-indigo-500/20 text-white dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="font-semibold text-white">Role-Based Portal Access</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-purple-500/20 text-white dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="font-semibold text-white">Supabase Cloud Integration</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTH & RECOVERY SECTIONS (7 cols) */}
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center space-y-6">

          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center justify-center mb-1 pb-4 border-b border-slate-200 dark:border-slate-800">
            <BrandLogo size="md" isWarm={false} />
          </div>

          {/* Header & Title */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {isRecoveryMode
                ? "Security Recovery"
                : isForgotPassword
                ? "Account Assistance"
                : isSignUp
                ? "Registration Portal"
                : "Authentication Portal"}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {isRecoveryMode
                ? "Set New Password"
                : isForgotPassword
                ? "Reset Your Password"
                : isSignUp
                ? "Create OS Identity"
                : "Sign In to Plannify.exe"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isRecoveryMode
                ? "Enter your new credentials below to restore your account access."
                : isForgotPassword
                ? "Enter your registered institutional email to receive a secure recovery link."
                : "Select your role portal to access your designated workspace."}
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
                  placeholder="e.g. faculty@lnctu.ac.in or admin@lnctu.ac.in"
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
            /* VIEW 3: STANDARD LOGIN & SIGN UP FORMS */
            <>
              {/* TWO LOGIN PORTAL SECTIONS SWITCHER */}
              <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPortalRole("admin")}
                  className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "admin"
                      ? "bg-white dark:bg-indigo-500/15 border-indigo-500 text-slate-900 dark:text-white shadow-md shadow-indigo-600/10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Admin
                    </span>
                    {portalRole === "admin" && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    Full institutional operations, timetable solver, faculty management, & settings
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPortalRole("teacher")}
                  className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "teacher"
                      ? "bg-white dark:bg-indigo-500/15 border-indigo-500 text-slate-900 dark:text-white shadow-md shadow-indigo-600/10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Faculty Member
                    </span>
                    {portalRole === "teacher" && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    Personal timetable schedule, individual attendance, workload analytics, & Leave Apply
                  </p>
                </button>
              </div>

              {/* AUTH FORM */}
              <form onSubmit={handleAuth} className="space-y-3.5 text-xs">
                {isSignUp && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g. Dr. Arvind Kumar"
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

                    {portalRole === "teacher" && (
                      <>
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
                      </>
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
                    placeholder={portalRole === "admin" ? "admin@planify.edu" : "faculty@planify.edu"}
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
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
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

                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); setError(""); setSuccessMessage(""); }}
                  className="w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pt-2"
                >
                  {isSignUp ? "Already registered? Sign In" : "Need an account? Register new identity"}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
