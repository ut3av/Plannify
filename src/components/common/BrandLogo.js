import React from 'react';

export default function BrandLogo({
  size = "md",
  isWarm = true,
  showIcon = false,
  onlyIcon = false,
  className = ""
}) {
  const heightMap = {
    xs: { main: "h-3.5", exe: "h-[10px] text-[8px]", icon: "w-4 h-4" },
    sm: { main: "h-4.5 sm:h-5", exe: "h-3.5 sm:h-4 text-[9px]", icon: "w-5 h-5" },
    md: { main: "h-6 md:h-6.5", exe: "h-4 md:h-4.5 text-[10px]", icon: "w-7 h-7" },
    lg: { main: "h-8 md:h-8.5", exe: "h-5 md:h-5.5 text-xs", icon: "w-9 h-9" },
    xl: { main: "h-10 md:h-11", exe: "h-6 md:h-7 text-sm", icon: "w-12 h-12" }
  };

  const current = heightMap[size] || heightMap.md;

  const shadowClass = isWarm
    ? "drop-shadow-[0_2px_10px_rgba(217,119,6,0.35)]"
    : "drop-shadow-[0_2px_10px_rgba(126,34,206,0.35)]";

  if (onlyIcon) {
    return (
      <img
        src="/favicon.png"
        alt="Plannify Logo"
        className={`${current.icon} object-contain ${shadowClass} shrink-0 ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center ${showIcon ? 'gap-2' : ''} shrink-0 align-middle ${className}`}>
      {showIcon && (
        <img
          src="/favicon.png"
          alt="Plannify Logo"
          className={`${current.icon} object-contain ${shadowClass} shrink-0 pointer-events-none`}
        />
      )}
      <span className="inline-flex items-center shrink-0">
        <img
          src={isWarm ? "/plannify-dark.png" : "/plannify-white.png"}
          alt="Plannify"
          className={`${current.main} object-contain pointer-events-none`}
        />
        {/* Harmonized .exe Badge with Theme-Aware Gradient & Warm Glow */}
        <span
          className={`inline-flex items-center justify-center font-mono font-black tracking-tighter px-1 rounded transition-all select-none -ml-0.5 ${
            isWarm
              ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-sm shadow-amber-600/30"
              : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/40"
          } ${current.exe}`}
          style={{ lineHeight: 1.1 }}
        >
          .exe
        </span>
      </span>
    </span>
  );
}
