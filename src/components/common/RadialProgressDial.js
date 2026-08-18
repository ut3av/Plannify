import React, { useState, useEffect } from "react";
import AnimatedCounter from "./AnimatedCounter";

/**
 * Production-Grade Radial SVG Circular Progress Dial
 * Features animated stroke-dashoffset transition, ambient glow, and centered metric counter.
 */
export default function RadialProgressDial({
  value = 0,
  size = 110,
  strokeWidth = 9,
  color = "#F59E0B",
  trackColor = "rgba(255, 255, 255, 0.08)",
  label = "",
  sublabel = "",
  suffix = "%",
  showCounter = true,
  glow = true,
  className = "",
}) {
  const [percent, setPercent] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Slight tick delay for smooth entrance transition
    const timer = setTimeout(() => {
      setPercent(Math.min(Math.max(value, 0), 100));
    }, 60);
    return () => clearTimeout(timer);
  }, [value]);

  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {glow && (
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-30 pointer-events-none transition-opacity duration-700"
            style={{ backgroundColor: color }}
          />
        )}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 origin-center"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Active Animated Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="radial-dial-circle"
          />
        </svg>

        {/* Centered Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          {showCounter ? (
            <div className="flex items-baseline justify-center">
              <AnimatedCounter
                target={value}
                duration={1200}
                className="text-lg sm:text-xl font-black text-white font-display"
              />
              <span className="text-xs font-semibold text-slate-300 ml-0.5">{suffix}</span>
            </div>
          ) : (
            <span className="text-lg font-black text-white">{value}{suffix}</span>
          )}
          {sublabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 -mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="mt-2 text-xs font-semibold text-slate-200 tracking-wide text-center">
          {label}
        </span>
      )}
    </div>
  );
}
