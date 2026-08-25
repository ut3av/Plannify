import React, { useState, useEffect, useRef } from "react";

/**
 * High-Performance GPU-timed Animated Number Counter
 * Uses requestAnimationFrame with easeOutExpo physics.
 * Zero external libraries, 60fps smooth.
 */
export default function AnimatedCounter({
  target = 0,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) {
  // Normalize target number
  const numericTarget = typeof target === "number" 
    ? target 
    : parseFloat(String(target).replace(/[^0-9.-]+/g, "")) || 0;

  const [displayValue, setDisplayValue] = useState(numericTarget);
  const prevTargetRef = useRef(numericTarget);
  const currentValueRef = useRef(numericTarget);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const startVal = currentValueRef.current;
    const endVal = numericTarget;
    startTimeRef.current = null;

    if (prevTargetRef.current === endVal && startVal === endVal) {
      return;
    }
    prevTargetRef.current = endVal;

    // Ease-out exponential easing curve
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = startVal + (endVal - startVal) * easedProgress;
      currentValueRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        currentValueRef.current = endVal;
        setDisplayValue(endVal);
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
