import React, { useState, useMemo, useEffect } from 'react';
import { generateQRCodeMatrix, generateQRCodeDataURL } from '../../utils/qrCodeGenerator';

const BRANCH_OPTIONS = [
  { id: "BCA", label: "BCA", subtitle: "Bachelor of Computer Applications (All Sections A–F)" },
  { id: "MCA", label: "MCA", subtitle: "Master of Computer Applications (All Sections A–B)" },
  { id: "AI-DA", label: "AI & DA", subtitle: "Artificial Intelligence & Data Analytics" },
  { id: "CSE", label: "CSE", subtitle: "Computer Science & Engineering" },
];

const VERCEL_DOMAIN = "https://plannify-alpha.vercel.app";

export default function ShareTimetableModal({ isOpen, onClose }) {
  const [selectedBranch, setSelectedBranch] = useState("BCA");
  const [urlMode, setUrlMode] = useState("current"); // 'current' | 'production' | 'custom'
  const [customHost, setCustomHost] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const currentOrigin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : VERCEL_DOMAIN;

  const activeBaseUrl = useMemo(() => {
    if (urlMode === "production") return VERCEL_DOMAIN;
    if (urlMode === "custom" && customHost.trim()) {
      const trimmed = customHost.trim();
      return trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `http://${trimmed}`;
    }
    return currentOrigin;
  }, [urlMode, customHost, currentOrigin]);

  const branchUrl = `${activeBaseUrl.replace(/\/+$/, '')}/public/timetable?branch=${encodeURIComponent(selectedBranch)}`;

  // Generate ISO 18004 QR Matrix with High Error Correction (30%)
  const qrMatrix = useMemo(() => {
    return generateQRCodeMatrix(branchUrl, { errorCorrectionLevel: 'H' });
  }, [branchUrl]);

  // Generate high-resolution PNG Data URL for download & crisp rendering
  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataURL(branchUrl, {
      errorCorrectionLevel: 'H',
      width: 500,
      margin: 2,
      darkColor: '#047857',
      lightColor: '#ffffff'
    }).then(url => {
      if (isMounted) setQrDataUrl(url);
    });
    return () => { isMounted = false; };
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
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `Plannify_${selectedBranch}_Live_Timetable_QR.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrintPlacard = () => {
    window.open(`${branchUrl}&print=true`, "_blank");
  };

  const matrixSize = qrMatrix.length || 33;
  const padding = 2; // Quiet zone
  const totalViewSize = matrixSize + padding * 2;

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
              <p className="text-xs text-slate-400">Live, camera-scannable real-time schedule portal</p>
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

        {/* ── Scannable QR Code Placard ── */}
        <div className="p-4 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col items-center relative">
            {/* Standard ISO 18004 SVG Scannable QR Matrix with Quiet Zone */}
            {qrMatrix.length > 0 ? (
              <svg
                className="w-48 h-48"
                viewBox={`0 0 ${totalViewSize} ${totalViewSize}`}
                shapeRendering="crispEdges"
              >
                <rect width={totalViewSize} height={totalViewSize} fill="#ffffff" />
                {qrMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    if (cell !== 1) return null;
                    const isFinder =
                      (rIdx < 7 && cIdx < 7) ||
                      (rIdx < 7 && cIdx >= matrixSize - 7) ||
                      (rIdx >= matrixSize - 7 && cIdx < 7);
                    return (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx + padding}
                        y={rIdx + padding}
                        width={1}
                        height={1}
                        fill={isFinder ? "#047857" : "#064e3b"}
                      />
                    );
                  })
                )}
              </svg>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                Generating QR...
              </div>
            )}

            {/* Subtle Brand Badge (Small, non-intrusive) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-lg shadow-md border-2 border-emerald-600 flex items-center justify-center pointer-events-none">
              <span className="text-emerald-700 font-black text-[10px] font-display leading-none">P</span>
            </div>

            <div className="mt-2.5 text-center">
              <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
                {selectedBranch} Master Timetable
              </span>
              <p className="text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                LNCT University • Real-Time Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium text-center">
            <span>📷 Scan with any phone camera to open live student portal</span>
          </div>
        </div>

        {/* QR Destination URL Mode Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Target Host / Destination:</span>
            <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setUrlMode("current")}
                className={`px-2 py-0.5 rounded ${
                  urlMode === "current" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Use current origin (recommended for local/network testing)"
              >
                Local/Current
              </button>
              <button
                type="button"
                onClick={() => setUrlMode("production")}
                className={`px-2 py-0.5 rounded ${
                  urlMode === "production" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Use Vercel production domain"
              >
                Vercel Prod
              </button>
              <button
                type="button"
                onClick={() => setUrlMode("custom")}
                className={`px-2 py-0.5 rounded ${
                  urlMode === "custom" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Type LAN IP or custom domain"
              >
                Custom IP
              </button>
            </div>
          </div>

          {urlMode === "custom" && (
            <input
              type="text"
              placeholder="e.g. 192.168.1.100:3000 or my-subdomain.ngrok-free.app"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-500 outline-none"
            />
          )}

          {/* Public URL Bar */}
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
            title="Download scannable high-res PNG image"
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
            title="Print classroom door placard"
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
