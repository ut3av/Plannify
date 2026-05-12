import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginPage({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              name: name || email.split('@')[0]
            }
          }
        });
        if (signUpError) throw signUpError;
        if (data?.user?.identities?.length === 0) {
            throw new Error("This email is already registered.");
        }
        setError("Success! If you aren't automatically logged in, check your email for a confirmation link.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Mesh */}
      <div className="glow-mesh" />
      
      {/* Animated Shapes */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }} />

      <div className="relative w-full max-w-[1000px] grid lg:grid-cols-2 gap-0 overflow-hidden glass-panel rounded-[32px] shadow-2xl border-white/10">
        
        {/* Left Side: Brand & Hero */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-r border-white/10">
          <div className="mb-8">
            <div className="flex items-center gap-0.5 mb-8 group">
              <img 
                src="https://see.fontimg.com/api/rf5/DYgy0/OTc3MzU3MmZhOGI2NGE4ODg0OTFhNjIyZTU1MDc1Y2Yub3Rm/UGxhbmlmeQ/qurovademo-regular.png?r=fs&h=81&w=1250&fg=FFFFFF&bg=transparent&tb=1&s=65" 
                alt="Planify" 
                className="h-10 md:h-12 object-contain" 
              />
              <span className="text-exe-glossy text-3xl md:text-4xl mt-1 tracking-tighter">.exe</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              Schedule the <span className="text-gradient">Future.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              The world's first AI-powered academic operating system. Effortless scheduling, intelligent automation.
            </p>
          </div>
          
          <div className="space-y-4">
            {[
              "Conflict-free OR-Tools Engine",
              "Groq AI Logic Validation",
              "Real-time Cloud Sync",
              "n8n Workflow Automation"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-slate-900/40">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-black text-white mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-slate-400 font-medium">
              {isSignUp ? "Start your academic revolution today." : "Log in to your Academic OS dashboard."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="flex bg-white/5 p-1 rounded-2xl mb-2 border border-white/5">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    role === "admin" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    role === "teacher" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Teacher
                </button>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-premium"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium"
                placeholder="name@university.edu"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className={`p-4 rounded-xl text-xs font-bold border ${
                error.includes("Success") 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-premium w-full mt-4"
            >
              {loading ? "Authenticating..." : (isSignUp ? "Initialize Account" : "Access OS")}
            </button>
            
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="w-full text-center text-sm font-bold text-slate-500 hover:text-indigo-400 transition-colors mt-6"
            >
              {isSignUp ? "Already part of the network? Sign In" : "New here? Create your identity"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
