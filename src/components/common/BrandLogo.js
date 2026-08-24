import React from 'react';

/**
 * Pixel-perfect Plannify Icon Mark SVG (matching reference gradient mark)
 */
export function PlannifyIconMark({ size = 28, isWarm = false, className = "" }) {
  const gradientId = isWarm ? "plannify_warm_grad" : "plannify_purple_grad";
  const innerGradId = isWarm ? "plannify_warm_inner" : "plannify_purple_inner";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-sm select-none ${className}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {isWarm ? (
            <>
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="40%" stopColor="#7C3AED" />
              <stop offset="80%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#A855F7" />
            </>
          )}
        </linearGradient>

        <linearGradient id={innerGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {isWarm ? (
            <>
              <stop offset="0%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#EA580C" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#4338CA" />
              <stop offset="100%" stopColor="#6D28D9" />
            </>
          )}
        </linearGradient>

        <filter id="plannify_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={isWarm ? "#EA580C" : "#7C3AED"} floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Smooth Rounded 'p' / Loop Ring */}
      <path
        d="M 50,14 
           C 70,14 86,30 86,50 
           C 86,70 70,86 50,86 
           C 30,86 16,71 16,51 
           L 16,84 
           C 16,87.5 13,90 9.5,90 
           C 6,90 3,87.5 3,84 
           L 3,50 
           C 3,24 24,14 50,14 Z"
        fill={`url(#${gradientId})`}
        filter="url(#plannify_glow)"
      />

      {/* Left Tail Highlight Stem */}
      <path
        d="M 16,48 L 16,84 C 16,88 12.5,90 9.5,90 C 6.5,90 3,88 3,84 L 3,48 C 3,36 10,24 24,18 C 17,26 16,37 16,48 Z"
        fill={`url(#${innerGradId})`}
        opacity="0.9"
      />

      {/* Pure White Circular Hole / Center Focal Core */}
      <circle cx="50" cy="50" r="18" fill="#FFFFFF" />

      {/* Top-Right Glowing Orbit Particle Dot */}
      <circle
        cx="88"
        cy="12"
        r="8"
        fill={isWarm ? "#FBBF24" : "#C084FC"}
      />
      <circle
        cx="88"
        cy="12"
        r="4"
        fill={isWarm ? "#FEF3C7" : "#E9D5FF"}
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
  textColor = "",
  exeColor = "",
  showExtension = true,
  variant = "text", // "text" | "badge"
}) {
  const sizeConfig = {
    xs: {
      iconSize: 18,
      textSize: "text-sm font-black",
      badgeSize: "text-[8px] px-1 py-0.2",
      gap: "gap-2"
    },
    sm: {
      iconSize: 22,
      textSize: "text-base font-black",
      badgeSize: "text-[9px] px-1.5 py-0.5",
      gap: "gap-2"
    },
    md: {
      iconSize: 28,
      textSize: "text-xl font-black",
      badgeSize: "text-[10px] px-2 py-0.5",
      gap: "gap-2.5"
    },
    lg: {
      iconSize: 36,
      textSize: "text-2xl sm:text-3xl font-black",
      badgeSize: "text-xs px-2.5 py-1",
      gap: "gap-3"
    },
    xl: {
      iconSize: 46,
      textSize: "text-3xl sm:text-4xl font-black",
      badgeSize: "text-sm px-3 py-1",
      gap: "gap-3.5"
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  if (onlyIcon) {
    return <PlannifyIconMark size={config.iconSize} isWarm={isWarm} className={className} />;
  }

  // Base brand text color (Plannify) - Deep dark / Navy-black in light mode, crisp white in dark
  const computedTextColor = textColor || (
    isWarm
      ? "text-[#1F140E] dark:text-[#FAF8F3]"
      : "text-[#111827] dark:text-white"
  );

  // Accent extension color (.exe) - Vibrant Purple/Violet gradient or solid
  const computedExeColor = exeColor || (
    textColor === "text-white"
      ? "text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]"
      : isWarm
      ? "text-amber-600 dark:text-amber-400"
      : "text-[#8B5CF6] dark:text-[#A78BFA]"
  );

  return (
    <span className={`inline-flex items-center ${config.gap} select-none shrink-0 align-middle ${className}`}>
      {showIcon && (
        <PlannifyIconMark size={config.iconSize} isWarm={isWarm} />
      )}

      <span className="inline-flex items-baseline leading-none">
        {/* Brand Name Typography (Bold Serif matching 1st image) */}
        <span
          className={`${config.textSize} ${computedTextColor} font-brand tracking-tight transition-colors font-black`}
          style={{ letterSpacing: "-0.03em" }}
        >
          Plannify
        </span>

        {/* Brand Extension (.exe) */}
        {showExtension && (
          variant === "badge" ? (
            <span
              className={`ml-1.5 inline-flex items-center justify-center font-mono font-black tracking-tight text-white rounded-lg shadow-sm transition-all duration-300 ${
                isWarm
                  ? "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 shadow-amber-600/30"
                  : "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 shadow-purple-500/30"
              } ${config.badgeSize}`}
              style={{ lineHeight: 1 }}
            >
              .exe
            </span>
          ) : (
            <span
              className={`${config.textSize} ${computedExeColor} font-brand tracking-tight transition-colors font-black`}
              style={{ letterSpacing: "-0.03em" }}
            >
              .exe
            </span>
          )
        )}
      </span>
    </span>
  );
}

