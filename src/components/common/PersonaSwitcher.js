import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../apiConfig";

export default function PersonaSwitcher({
  currentRole = "Admin",
  currentUser,
  teachers = [],
  onSwitchUser,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("select"); // "select" | "new"
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("+91-");
  const [newDept, setNewDept] = useState("Computer Applications");
  const [newDesignation, setNewDesignation] = useState("Assistant Professor");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectTeacher = (teacher) => {
    const tName = typeof teacher === "string" ? teacher : teacher.name || teacher.teacher_name;
    const tEmail = (typeof teacher === "object" && teacher.email) || `${tName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@lnctu.ac.in`;
    onSwitchUser({
      role: "teacher",
      name: tName,
      email: tEmail,
      department: (typeof teacher === "object" && teacher.department) || "Computer Applications",
    });
    onClose && onClose();
  };

  const handleSwitchToAdmin = () => {
    onSwitchUser({
      role: "admin",
      name: "Dean / Administrator",
      email: "admin@lnctu.ac.in",
    });
    onClose && onClose();
  };

  const handleCreateAndLogin = async (e) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    setIsCreating(true);

    const email = newEmail.trim() || `${newTeacherName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@lnctu.ac.in`;
    const hash = Math.abs(newTeacherName.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0));
    const empId = `EMP-LNCT-${(hash % 9000) + 1000}`;

    const newFacultyPayload = {
      teacher_name: newTeacherName.trim(),
      employee_id: empId,
      email,
      phone: newPhone.trim() || "+91-9876543210",
      department_name: newDept,
      designation: newDesignation,
      employment_type: "full-time",
      status: "active",
    };

    try {
      await axios.post(`${API_BASE_URL}/faculty/`, newFacultyPayload).catch(() => null);
    } catch {
      // Handled gracefully
    }

    onSwitchUser({
      role: "teacher",
      name: newTeacherName.trim(),
      email,
      department: newDept,
      designation: newDesignation,
      isNew: true,
    });
    setIsCreating(false);
    onClose && onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="card p-6 bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm shadow-md">
              🎭
            </div>
            <div>
              <h3 className="text-base font-black text-white">Live Persona Switcher</h3>
              <p className="text-[11px] text-slate-400">Instantly test bidirectional Admin ⇄ Teacher workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab("select")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "select"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            👨‍🏫 Switch to Existing Faculty
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "new"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ➕ Onboard New Faculty
          </button>
        </div>

        {activeTab === "select" ? (
          <div className="space-y-4">
            {/* Switch to Admin Option */}
            <div
              onClick={handleSwitchToAdmin}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                currentRole.toLowerCase() === "admin"
                  ? "bg-indigo-600/25 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg">
                  👑
                </span>
                <div>
                  <h4 className="font-black text-xs text-white">Administrator Console</h4>
                  <p className="text-[11px] text-slate-400">Master timetable, faculty approvals, solver & analytics</p>
                </div>
              </div>
              {currentRole.toLowerCase() === "admin" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold">
                  Active
                </span>
              )}
            </div>

            {/* List of Faculty members */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Simulate Faculty Member Login:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {teachers.map((t, idx) => {
                  const tName = typeof t === "string" ? t : t.name || t.teacher_name;
                  const tDept = (typeof t === "object" && t.department) || "Computer Applications";
                  const isCurrent = currentUser?.name === tName;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectTeacher(t)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-indigo-300">
                          {tName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-white">{tName}</p>
                          <p className="text-[10px] text-slate-400">{tDept}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold group-hover:underline">
                        {isCurrent ? "✓ Current Portal" : "Login as Teacher ➔"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* New Teacher Onboarding Form */
          <form onSubmit={handleCreateAndLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Teacher Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Rajesh Verma"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                className="input-premium w-full text-white bg-slate-800 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="rajesh.verma@lnctu.ac.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-premium w-full text-white bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="input-premium w-full text-white bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Department
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="input-premium w-full text-white bg-slate-800 border-slate-700 cursor-pointer"
                >
                  <option value="Computer Applications">Computer Applications</option>
                  <option value="AI & DA">AI & DA</option>
                  <option value="Information Technology">Information Technology</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Designation
                </label>
                <select
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="input-premium w-full text-white bg-slate-800 border-slate-700 cursor-pointer"
                >
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚡</span> Automated Onboarding Pipeline
              </p>
              <p className="text-slate-400">
                Creates faculty profile, generates initial biometric punch ledger, triggers welcome email webhook, and logs directly into the Teacher Portal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !newTeacherName.trim()}
                className="btn-gradient px-5 py-2 text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                {isCreating ? "Onboarding..." : "✨ Onboard & Launch Portal ➔"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
