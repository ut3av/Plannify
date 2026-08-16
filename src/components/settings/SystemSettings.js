import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL as API } from "../../apiConfig";

export default function SystemSettings({ userRole = "Super Admin" }) {
  const [config, setConfig] = useState({ low_threshold: 12, high_threshold: 18, academic_year: "2026-27" });
  const [loading, setLoading] = useState(true);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/analytics/config`);
      if (res.data) setConfig(res.data);
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/analytics/config`, config);
      setSavedNote("Institutional parameters saved successfully!");
      setTimeout(() => setSavedNote(""), 3000);
    } catch (e) {
      alert("Failed to update system settings");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="card p-6 bg-slate-900 border border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white">Institutional System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure academic workload parameters, scheduling rules, leave policies, and role permissions.
        </p>
      </div>

      {savedNote && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          ✓ {savedNote}
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workload Threshold Settings */}
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            ⚙️ Workload Threshold Parameters
          </h2>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Academic Year</label>
              <input
                type="text"
                value={config.academic_year}
                onChange={(e) => setConfig({ ...config, academic_year: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Low Workload Threshold (periods/week)</label>
              <input
                type="number"
                value={config.low_threshold}
                onChange={(e) => setConfig({ ...config, low_threshold: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Faculty with teaching load under this threshold are classified as Low Workload.</p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">High Workload Threshold (periods/week)</label>
              <input
                type="number"
                value={config.high_threshold}
                onChange={(e) => setConfig({ ...config, high_threshold: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Faculty exceeding this threshold trigger Early Warning Workload Insights.</p>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-bold">
              Save Institutional Configuration
            </button>
          </form>
        </div>

        {/* Roles & Permissions Card */}
        <div className="card p-6 bg-slate-900/90 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            🛡️ Role-Based Access Control (RBAC)
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Admin</p>
                <p className="text-[10px] text-slate-400">Full institutional operations, timetable solver, faculty management, & settings</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Admin Scope</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Faculty Member</p>
                <p className="text-[10px] text-slate-400">Personal timetable schedule, individual attendance, workload analytics, & Leave Apply</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">Faculty Scope</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
