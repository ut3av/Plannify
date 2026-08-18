import React, { useState, useEffect, useRef } from "react";

/**
 * High-Performance GPU-timed Animated Number Counter
 * Uses requestAnimationFrame with easeOutExpo physics.
 * Zero external libraries, 60fps smooth.
 */
export default function AnimatedCounter({
  target = 0,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef(0);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Normalize target number
  const numericTarget = typeof target === "number" 
    ? target 
    : parseFloat(String(target).replace(/[^0-9.-]+/g, "")) || 0;

  useEffect(() => {
    const startVal = startRef.current;
    const endVal = numericTarget;
    startTimeRef.current = null;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    // Ease-out exponential easing curve
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = startVal + (endVal - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        startRef.current = endVal;
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [numericTarget, duration]);

  const formatted = decimals > 0 
    ? displayValue.toFixed(decimals) 
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={`inline-block tabular-nums font-bold tracking-tight ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
