import React, { useState, useMemo } from 'react';
import { generateQRCodeMatrix } from '../../utils/qrCodeGenerator';

const BRANCH_OPTIONS = [
  { id: "BCA", label: "BCA", subtitle: "Bachelor of Computer Applications (All Sections A–F)" },
  { id: "MCA", label: "MCA", subtitle: "Master of Computer Applications (All Sections A–B)" },
  { id: "AI-DA", label: "AI & DA", subtitle: "Artificial Intelligence & Data Analytics" },
  { id: "CSE", label: "CSE", subtitle: "Computer Science & Engineering" },
];

const VERCEL_DOMAIN = "https://plannify-alpha.vercel.app";

export default function ShareTimetableModal({ isOpen, onClose }) {
  const [selectedBranch, setSelectedBranch] = useState("BCA");
  const [useProductionUrl, setUseProductionUrl] = useState(true);
  const [copied, setCopied] = useState(false);

  const baseUrl = useProductionUrl
    ? VERCEL_DOMAIN
    : (typeof window !== "undefined" ? window.location.origin : VERCEL_DOMAIN);
  const branchUrl = `${baseUrl}/public/timetable?branch=${encodeURIComponent(selectedBranch)}`;

  // Generate real ISO 18004 QR Matrix
  const qrMatrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(branchUrl);
    } catch (e) {
      console.warn("QR Generation note:", e);
      return [];
    }
  }, [branchUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(branchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPNG = () => {
    if (!qrMatrix || qrMatrix.length === 0) return;
    const canvas = document.createElement("canvas");
    const matrixSize = qrMatrix.length;
    const cellSize = 16;
    const margin = 32;
    const totalSize = matrixSize * cellSize + margin * 2;

    canvas.width = totalSize;
    canvas.height = totalSize + 70;
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR Modules
    ctx.fillStyle = "#047857";
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (qrMatrix[r][c] === 1) {
          const x = margin + c * cellSize;
          const y = margin + r * cellSize;
          ctx.fillRect(x, y, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }

    // Draw Footer Label
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`LNCT University • ${selectedBranch} Timetable`, totalSize / 2, totalSize + 36);

    ctx.fillStyle = "#059669";
    ctx.font = "14px sans-serif";
    ctx.fillText("Scan with any mobile camera to view live schedule", totalSize / 2, totalSize + 58);

    // Download trigger
    const link = document.createElement("a");
    link.download = `Plannify_${selectedBranch}_Timetable_QR.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePrintPlacard = () => {
    window.open(`${branchUrl}&print=true`, "_blank");
  };

  const matrixSize = qrMatrix.length || 21;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print">
      <div className="card max-w-md w-full p-6 bg-slate-900 border border-slate-700/90 text-white rounded-3xl shadow-2xl space-y-5 animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight font-display">Student Branch QR Code</h3>
              <p className="text-xs text-slate-400">Dynamic QR access for student branch schedules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Branch Selection Pills */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
            Select Student Branch:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BRANCH_OPTIONS.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => setSelectedBranch(branch.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  selectedBranch === branch.id
                    ? "bg-emerald-600/25 border-emerald-400 text-white shadow-lg ring-1 ring-emerald-400"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <span className="text-xs font-black text-white">{branch.label}</span>
                <span className="text-[10px] text-slate-400 truncate mt-0.5">{branch.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Brand Scannable QR Code Placard ── */}
        <div className="p-4 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
          <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center relative">
            {/* Real SVG Scannable QR Matrix */}
            <svg
              className="w-44 h-44"
              viewBox={`0 0 ${matrixSize} ${matrixSize}`}
              shapeRendering="crispEdges"
            >
              <rect width={matrixSize} height={matrixSize} fill="#ffffff" />
              {qrMatrix.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  if (cell !== 1) return null;
                  // Color finder patterns in brand emerald, inner data in dark emerald/slate
                  const isFinder =
                    (rIdx < 7 && cIdx < 7) ||
                    (rIdx < 7 && cIdx >= matrixSize - 7) ||
                    (rIdx >= matrixSize - 7 && cIdx < 7);
                  return (
                    <rect
                      key={`${rIdx}-${cIdx}`}
                      x={cIdx}
                      y={rIdx}
                      width={1}
                      height={1}
                      fill={isFinder ? "#047857" : "#064e3b"}
                    />
                  );
                })
              )}
            </svg>

            {/* Centered Brand Emblem Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-xl shadow-md border-2 border-emerald-600 flex items-center justify-center pointer-events-none">
              <span className="text-emerald-700 font-black text-xs font-display">P</span>
            </div>

            <div className="mt-2 text-center">
              <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
                {selectedBranch} Master Timetable
              </span>
              <p className="text-[9px] font-bold text-emerald-700">LNCT University • Live Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Scan with any camera • Directed to Vercel Live Deployment</span>
          </div>
        </div>

        {/* Public URL Bar with Vercel Production Link Indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
            <span>Live Vercel Destination:</span>
            <button
              type="button"
              onClick={() => setUseProductionUrl(!useProductionUrl)}
              className="text-emerald-400 hover:text-emerald-300 underline font-mono text-[10px]"
            >
              {useProductionUrl ? "Switch to Localhost" : "Switch to Vercel Prod"}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-xs">
            <input
              type="text"
              readOnly
              value={branchUrl}
              className="bg-transparent text-slate-300 font-mono flex-1 outline-none px-2 truncate text-[11px]"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                copied ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            title="Download high-resolution scannable PNG image"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </button>

          <button
            type="button"
            onClick={handlePrintPlacard}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            title="Print classroom door signage placard"
          >
            <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Placard
          </button>

          <a
            href={branchUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-xs py-2 px-3.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-none flex items-center gap-1 shadow-md shrink-0"
          >
            Open Live ↗
          </a>
        </div>
      </div>
    </div>
  );
}
