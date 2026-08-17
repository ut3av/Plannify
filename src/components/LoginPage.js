import React, { useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../apiConfig";
import BrandLogo from "./common/BrandLogo";

export default function LoginPage() {
  const [portalRole, setPortalRole] = useState("teacher"); // "admin" | "teacher"
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Computer Applications");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [employeeId, setEmployeeId] = useState(`EMP-LNCT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
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

        // 2. Auto-Registration Hook: Insert into Faculty Directory (backend database)
        if (portalRole === "teacher") {
          try {
            await axios.post(`${API_BASE_URL}/faculty/`, {
              teacher_name: teacherName,
              email: email,
              phone: phone || "+91-9876543210",
              employee_id: empId,
              designation: designation || "Assistant Professor",
              employment_type: "full-time",
              status: "active",
              qualification: "M.Tech / Ph.D",
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

            if (cloudData) {
              let tList = [];
              const rawTeachers = cloudData.teachers ?? cloudData.room;
              if (rawTeachers) {
                try {
                  tList = typeof rawTeachers === 'string' ? JSON.parse(rawTeachers) : rawTeachers;
                } catch {
                  tList = [];
                }
              }
              if (Array.isArray(tList) && !tList.some(t => (t.name || t) === teacherName)) {
                tList.push({
                  name: teacherName,
                  department: department || "Computer Applications",
                  phone: phone || "+91-9876543210",
                  email: email,
                  employee_id: empId,
                  designation: designation,
                  free_periods: 1
                });
                await supabase
                  .from('timetable_state')
                  .update({ teachers: tList, updated_at: new Date().toISOString() })
                  .eq('id', 'draft');
              }
            }
          } catch (cloudErr) {
            console.warn("Cloud state sync for new faculty:", cloudErr);
          }
        }

        setError("Success! Account created & synchronized with Faculty Directory. You can now sign in.");
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Optionally update metadata if portalRole was explicitly chosen
        if (signInData?.user) {
          await supabase.auth.updateUser({
            data: { role: portalRole, name: name || signInData.user.user_metadata?.name || email.split('@')[0] }
          });
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Background Mesh & Glow */}
      <div className="glow-mesh" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[1020px] grid lg:grid-cols-12 gap-0 overflow-hidden bg-slate-900/90 rounded-[32px] shadow-2xl border border-slate-800 backdrop-blur-xl">

        {/* LEFT COLUMN: BRAND HERO (5 cols) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3.5 mb-8">
              <img 
                src="/favicon.png" 
                alt="Plannify" 
                className="w-12 h-12 object-contain drop-shadow-[0_4px_20px_rgba(126,34,206,0.45)]" 
              />
              <BrandLogo size="lg" />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white mb-3 leading-snug">
              Smart Academic <br />
              <span className="text-gradient">Operations Platform</span>
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed">
              University-grade automated scheduling, real-time timetable optimization, and operational faculty analytics.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</div>
              <span>OR-Tools AI Constraint Solver</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">✓</div>
              <span>Role-Based Portal Access</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">✓</div>
              <span>Supabase Cloud Integration</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2 PORTAL LOGIN SECTIONS (7 cols) */}
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center space-y-6">

          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-1 pb-4 border-b border-slate-800">
            <img 
              src="/favicon.png" 
              alt="Plannify" 
              className="w-9 h-9 object-contain drop-shadow-[0_2px_12px_rgba(126,34,206,0.4)]" 
            />
            <BrandLogo size="md" />
          </div>

          {/* Header & Title */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              {isSignUp ? "Registration Portal" : "Authentication Portal"}
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              {isSignUp ? "Create OS Identity" : "Sign In to Plannify.exe"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your role portal to access your designated workspace.
            </p>
          </div>

          {/* TWO LOGIN PORTAL SECTIONS SWITCHER */}
          <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setPortalRole("admin")}
              className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "admin"
                  ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">🛡️ Admin</span>
                {portalRole === "admin" && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                Full institutional operations, timetable solver, faculty management, & settings
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPortalRole("teacher")}
              className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between border ${portalRole === "teacher"
                  ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">👨‍🏫 Faculty Member</span>
                {portalRole === "teacher" && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
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
                    <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Dr. Arvind Kumar"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Phone / Mobile *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="+91-9876543210"
                    />
                  </div>
                </div>

                {portalRole === "teacher" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Department</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Computer Applications">Computer Applications (BCA/MCA)</option>
                          <option value="AI & DA">AI & Data Science (B.Tech)</option>
                          <option value="Computer Science & Engineering">Computer Science & Eng (CSE)</option>
                          <option value="Information Technology">Information Technology (IT)</option>
                          <option value="Management Studies">Management Studies (MBA/BBA)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Designation</label>
                        <select
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Lecturer">Lecturer</option>
                          <option value="Lab Instructor">Lab Instructor</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-300">Employee ID</label>
                        <span className="text-[10px] text-slate-500 font-mono">Institutional Identifier</span>
                      </div>
                      <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="EMP-LNCT-1001"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={portalRole === "admin" ? "admin@planify.edu" : "faculty@planify.edu"}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className={`p-3 rounded-xl font-semibold border ${error.includes("Success")
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xs font-bold gap-2 justify-center shadow-lg shadow-indigo-500/20 mt-2"
            >
              {loading ? "Authenticating..." : (isSignUp ? `Initialize ${portalRole === 'admin' ? 'Admin' : 'Faculty'} Account` : `Sign In to ${portalRole === 'admin' ? 'Admin OS' : 'Faculty Portal'}`)}
            </button>

            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-indigo-300 transition-colors pt-2"
            >
              {isSignUp ? "Already registered? Sign In" : "Need an account? Register new identity"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
