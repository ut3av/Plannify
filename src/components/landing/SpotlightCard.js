import React, { useRef, useState, useCallback } from 'react';

/**
 * SpotlightCard - Antigravity-inspired interactive mouse-following glow card
 * Creates a dynamic radial light gradient that moves with the user's cursor
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Container classes
 * @param {boolean} [props.tilt=false] - Whether to apply smooth 3D tilt
 * @param {string} [props.spotlightColor='rgba(99, 102, 241, 0.14)'] - Spotlight glow color
 * @param {function} [props.onClick] - Click handler
 */
export default function SpotlightCard({
  children,
  className = '',
  tilt = false,
  spotlightColor = 'rgba(99, 102, 241, 0.14)',
  onClick,
  ...rest
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
  });

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });
    setOpacity(1);

    if (tilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5; // max -5deg to +5deg
      const rotateY = ((x - centerX) / centerX) * 5;

      setTiltStyle({
        transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`,
        transition: 'transform 0.1s ease-out',
      });
    }
  }, [tilt]);

  const handleMouseEnter = useCallback(() => {
    setOpacity(1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
    if (tilt) {
      setTiltStyle({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    }
  }, [tilt]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        ...tiltStyle,
      }}
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
      {...rest}
    >
      {/* ── Dynamic Mouse-Follower Radial Spotlight ── */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(420px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
        aria-hidden="true"
      />

      {/* ── Subtle Border Flare Highlight ── */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300 z-10"
        style={{
          opacity: opacity * 0.7,
          background: `radial-gradient(280px circle at ${position.x}px ${position.y}px, rgba(255, 255, 255, 0.25), transparent 70%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
        aria-hidden="true"
      />

      {/* ── Card Content ── */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
