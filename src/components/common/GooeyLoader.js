import React from 'react';

/**
 * Custom Gooey Orbital Physics Loader
 * Uses CSS blur, contrast filter and darken mix-blend-mode for an organic metaball effect.
 */
export default function GooeyLoader({
  size = "md", // "sm" | "md" | "lg"
  text = "",
  subtitle = "",
  className = "",
}) {
  const sizeClass = size === "sm" ? "loader-sm" : size === "lg" ? "loader-lg" : "loader-md";

  return (
    <div className={`flex flex-col items-center justify-center gap-3.5 ${className}`}>
      <div className="loader-wrapper animate-scale-in">
        <div className={`loader ${sizeClass}`}></div>
      </div>
      {text && (
        <div className="text-center animate-fade-in">
          <p className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">{text}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
