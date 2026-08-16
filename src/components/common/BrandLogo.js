import React from 'react';

export default function BrandLogo({ size = "md", isWarm = false, className = "" }) {
  const heightMap = {
    xs: "h-3.5",
    sm: "h-5",
    md: "h-6 md:h-7",
    lg: "h-8 md:h-9",
    xl: "h-11 md:h-12"
  };

  const h = heightMap[size] || "h-6 md:h-7";

  return (
    <span className={`inline-flex items-center shrink-0 align-middle ${className}`}>
      <img
        src={isWarm ? "/plannify-dark.png" : "/plannify-white.png"}
        alt="Plannify"
        className={`${h} object-contain pointer-events-none`}
      />
      <img
        src={isWarm ? "/exe-dark-purple.png" : "/exe-purple.png"}
        alt=".exe"
        className={`${h} object-contain -ml-1.5 pointer-events-none drop-shadow-[0_0_12px_rgba(192,132,252,0.6)]`}
      />
    </span>
  );
}
