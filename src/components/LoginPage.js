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
        // onLogin will be handled by the App.js auth listener!
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 text-slate-100 p-4">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="glass-card p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex justify-center">
              <img src="https://see.fontimg.com/api/rf5/DYgy0/OTc3MzU3MmZhOGI2NGE4ODg0OTFhNjIyZTU1MDc1Y2Yub3Rm/UGxhbmlmeS5leGU/qurovademo-regular.png?r=fs&h=81&w=1250&fg=FFFFFF&bg=FFFFFF&tb=1&s=65" alt="Planify.exe" className="h-9 object-contain" />
            </h1>
            <p className="text-violet-400 font-bold text-xs uppercase tracking-widest mb-2">Supabase Auth Integrated</p>
            <p className="text-slate-400 text-sm">Cloud-Enabled Academic Scheduling Platform</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="flex bg-slate-800/50 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    role === "admin" ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    role === "teacher" ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Teacher
                </button>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                placeholder="teacher@school.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                placeholder="Enter strong password"
              />
            </div>

            {error && (
              <p className={`text-sm text-center animate-shake ${error.includes("Success") ? "text-emerald-400" : "text-red-400"}`}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl py-3 mt-2 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
            </button>
            
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
