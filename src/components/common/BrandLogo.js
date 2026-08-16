import React from 'react';

export default function BrandLogo({ size = "md", isWarm = false, className = "" }) {
  const heightMap = {
    xs: { main: "h-3.5", exe: "h-[9px]" },
    sm: { main: "h-4.5 sm:h-5", exe: "h-3 sm:h-3.5" },
    md: { main: "h-6 md:h-6.5", exe: "h-3.5 md:h-4" },
    lg: { main: "h-8 md:h-8.5", exe: "h-5 md:h-5.5" },
    xl: { main: "h-10 md:h-11", exe: "h-6 md:h-7" }
  };

  const current = heightMap[size] || heightMap.md;

  return (
    <span className={`inline-flex items-center shrink-0 align-middle ${className}`}>
      <img
        src={isWarm ? "/plannify-dark.png" : "/plannify-white.png"}
        alt="Plannify"
        className={`${current.main} object-contain pointer-events-none`}
      />
      <img
        src={isWarm ? "/exe-dark-purple.png" : "/exe-purple.png"}
        alt=".exe"
        className={`${current.exe} object-contain -ml-1 pointer-events-none drop-shadow-[0_0_8px_rgba(192,132,252,0.5)] transition-all`}
      />
    </span>
  );
}
