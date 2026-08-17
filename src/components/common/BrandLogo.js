import React from 'react';

/**
 * Pixel-perfect Plannify Icon Mark SVG
 */
export function PlannifyIconMark({ size = 28, isWarm = false, className = "" }) {
  const gradientId = isWarm ? "plannify_warm_grad" : "plannify_indigo_grad";
  const glowId = isWarm ? "plannify_warm_glow" : "plannify_indigo_glow";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md select-none ${className}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="10%" y1="10%" x2="90%" y2="90%">
          {isWarm ? (
            <>
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="50%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#F59E0B" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A855F7" />
            </>
          )}
        </linearGradient>

        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          {isWarm ? (
            <>
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#D97706" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#9333EA" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Orbit Petal Wing */}
      <path
        d="M74 34 C84 48, 81 65, 68 76 C53 89, 29 84, 18 71 C8 58, 12 38, 26 26 C41 13, 63 18, 74 34 Z"
        fill={`url(#${gradientId})`}
      />

      {/* Stylized P Stem Accent */}
      <path
        d="M26 42 L26 80 C26 83, 23 86, 20 86 C17 86, 14 83, 14 80 L14 42 Z"
        fill={`url(#${glowId})`}
        opacity="0.85"
      />

      {/* Inner Crisp Focal Core */}
      <circle cx="48" cy="53" r="16.5" fill="#FFFFFF" />

      {/* Orbiting Satellite Particle */}
      <circle
        cx="77"
        cy="19"
        r="7.5"
        fill={isWarm ? "#FBBF24" : "#C084FC"}
      />
    </svg>
  );
}

export default function BrandLogo({
  size = "md",
  isWarm = false,
  showIcon = true,
  onlyIcon = false,
  className = "",
  textColor = ""
}) {
  const sizeConfig = {
    xs: {
      iconSize: 18,
      textSize: "text-xs font-black",
      badgeSize: "text-[8px] px-1 py-0.2",
      gap: "gap-1.5"
    },
    sm: {
      iconSize: 22,
      textSize: "text-sm font-black",
      badgeSize: "text-[9px] px-1.5 py-0.5",
      gap: "gap-2"
    },
    md: {
      iconSize: 28,
      textSize: "text-lg font-black",
      badgeSize: "text-[10px] px-2 py-0.5",
      gap: "gap-2.5"
    },
    lg: {
      iconSize: 36,
      textSize: "text-2xl font-black",
      badgeSize: "text-xs px-2.5 py-1",
      gap: "gap-3"
    },
    xl: {
      iconSize: 46,
      textSize: "text-3xl font-black",
      badgeSize: "text-sm px-3 py-1",
      gap: "gap-3.5"
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  if (onlyIcon) {
    return <PlannifyIconMark size={config.iconSize} isWarm={isWarm} className={className} />;
  }

  const computedTextColor = textColor || (isWarm ? "text-[#1F140E]" : "text-white");

  return (
    <span className={`inline-flex items-center ${config.gap} select-none shrink-0 align-middle ${className}`}>
      {showIcon && (
        <PlannifyIconMark size={config.iconSize} isWarm={isWarm} />
      )}

      <span className="inline-flex items-center gap-1.5">
        {/* Brand Name Typography */}
        <span
          className={`${config.textSize} ${computedTextColor} tracking-tight font-display transition-colors`}
          style={{ letterSpacing: "-0.03em" }}
        >
          Plannify
        </span>

        {/* Brand Extension Pill Badge (.exe) */}
        <span
          className={`inline-flex items-center justify-center font-mono font-black tracking-tight text-white rounded-lg shadow-sm transition-all duration-300 ${
            isWarm
              ? "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 shadow-amber-600/30"
              : "bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] shadow-indigo-500/30"
          } ${config.badgeSize}`}
          style={{ lineHeight: 1 }}
        >
          .exe
        </span>
      </span>
    </span>
  );
}
