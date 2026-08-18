import React from 'react';

/**
 * MarkerHighlight - Hand-drawn organic highlighter brush stroke component
 * Inspired by modern educational & SaaS design systems (OpenEduCat, Notion, Linear)
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Text to highlight
 * @param {'yellow'|'coral'|'emerald'|'indigo'|'cyan'|'amber'} [props.color='yellow'] - Tint color
 * @param {'brush'|'scribble'|'underline'|'box'} [props.variant='brush'] - Stroke style
 * @param {string} [props.className] - Additional class names
 */
export default function MarkerHighlight({
  children,
  color = 'yellow',
  variant = 'brush',
  className = '',
}) {
  const colorMap = {
    yellow: {
      fill: '#FDE047',
      stroke: '#FACC15',
      lightOpacity: '0.65',
      darkOpacity: '0.35',
      glow: 'rgba(250, 204, 21, 0.25)',
    },
    coral: {
      fill: '#FDA4AF',
      stroke: '#FB7185',
      lightOpacity: '0.70',
      darkOpacity: '0.35',
      glow: 'rgba(251, 113, 133, 0.25)',
    },
    rose: {
      fill: '#FECDD3',
      stroke: '#F43F5E',
      lightOpacity: '0.70',
      darkOpacity: '0.35',
      glow: 'rgba(244, 63, 94, 0.25)',
    },
    emerald: {
      fill: '#A7F3D0',
      stroke: '#34D399',
      lightOpacity: '0.65',
      darkOpacity: '0.35',
      glow: 'rgba(52, 211, 153, 0.25)',
    },
    indigo: {
      fill: '#C7D2FE',
      stroke: '#818CF8',
      lightOpacity: '0.65',
      darkOpacity: '0.35',
      glow: 'rgba(129, 140, 248, 0.25)',
    },
    cyan: {
      fill: '#BAE6FD',
      stroke: '#38BDF8',
      lightOpacity: '0.65',
      darkOpacity: '0.35',
      glow: 'rgba(56, 189, 248, 0.25)',
    },
    amber: {
      fill: '#FED7AA',
      stroke: '#FB923C',
      lightOpacity: '0.70',
      darkOpacity: '0.35',
      glow: 'rgba(251, 146, 60, 0.25)',
    },
  };

  const theme = colorMap[color] || colorMap.yellow;

  return (
    <span className={`relative inline-block whitespace-nowrap z-0 px-1 mx-0.5 group ${className}`}>
      {/* ── Organic SVG Stroke Layer Behind Text ── */}
      <span
        className="absolute -inset-x-2 -inset-y-1 w-[calc(100%+16px)] h-[calc(100%+8px)] pointer-events-none -z-10 transition-transform duration-300 group-hover:scale-[1.02]"
        style={{
          filter: `drop-shadow(0 1px 2px ${theme.glow})`,
        }}
        aria-hidden="true"
      >
        {variant === 'brush' && (
          /* Organic Hand-Drawn Marker Block (Matches User Screenshot 1) */
          <svg
            viewBox="0 0 300 45"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{
              opacity: 'var(--marker-opacity, 0.65)',
            }}
          >
            <style>{`
              .light svg { --marker-opacity: ${theme.lightOpacity}; }
              .dark svg { --marker-opacity: ${theme.darkOpacity}; }
            `}</style>
            {/* Primary soft watercolor block */}
            <path
              d="M 6 22 
                 C 20 8, 55 14, 95 10 
                 C 135 6, 185 12, 230 7 
                 C 260 4, 288 9, 296 18 
                 C 300 24, 294 34, 280 37 
                 C 240 43, 180 38, 120 42 
                 C 70 45, 25 39, 8 34 
                 C 2 30, 2 24, 6 22 Z"
              fill={theme.fill}
            />
            {/* Secondary textured overlapping stroke */}
            <path
              d="M 12 18 
                 C 45 10, 110 16, 175 11 
                 C 225 7, 270 14, 292 22 
                 C 285 30, 245 35, 195 33 
                 C 140 37, 75 32, 20 35 
                 C 10 32, 8 22, 12 18 Z"
              fill={theme.stroke}
              opacity="0.35"
            />
          </svg>
        )}

        {variant === 'scribble' && (
          /* Jagged Marker Scribble Zigzag (Matches User Screenshot 2) */
          <svg
            viewBox="0 0 320 45"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{
              opacity: 'var(--marker-opacity, 0.70)',
            }}
          >
            <style>{`
              .light svg { --marker-opacity: ${theme.lightOpacity}; }
              .dark svg { --marker-opacity: ${theme.darkOpacity}; }
            `}</style>
            {/* Thick highlighter marker zigzag path */}
            <path
              d="M 6 24 
                 Q 14 8, 22 28 
                 Q 30 9, 38 31 
                 Q 46 7, 54 29 
                 Q 62 10, 70 32 
                 Q 78 8, 86 30 
                 Q 94 11, 102 31 
                 Q 110 7, 118 29 
                 Q 126 10, 134 32 
                 Q 142 8, 150 30 
                 Q 158 11, 166 31 
                 Q 174 7, 182 29 
                 Q 190 10, 198 32 
                 Q 206 8, 214 30 
                 Q 222 11, 230 31 
                 Q 238 7, 246 29 
                 Q 254 10, 262 32 
                 Q 270 8, 278 30 
                 Q 286 11, 294 31 
                 Q 302 9, 314 22"
              fill="none"
              stroke={theme.stroke}
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
            {/* Secondary underlying soft fill */}
            <path
              d="M 10 20 C 60 10, 160 12, 260 9 C 295 8, 310 16, 312 24 C 305 34, 250 38, 150 40 C 60 41, 15 36, 8 28 Z"
              fill={theme.fill}
              opacity="0.5"
            />
          </svg>
        )}

        {variant === 'underline' && (
          /* Expressive Curved Hand-Drawn Underline */
          <svg
            viewBox="0 0 250 24"
            preserveAspectRatio="none"
            className="w-full h-full translate-y-3"
          >
            <path
              d="M 4 14 C 45 20, 115 22, 175 14 C 205 10, 235 8, 246 16"
              fill="none"
              stroke={theme.stroke}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 20 18 C 75 23, 140 21, 220 16"
              fill="none"
              stroke={theme.fill}
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
        )}

        {variant === 'box' && (
          /* Hand-Drawn Sketch Box */
          <svg
            viewBox="0 0 220 50"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path
              d="M 6 12 C 45 4, 165 6, 212 10 C 218 20, 214 38, 210 44 C 165 48, 55 46, 8 42 C 4 32, 3 18, 6 12 Z"
              fill={theme.fill}
              stroke={theme.stroke}
              strokeWidth="2.5"
              strokeLinejoin="round"
              opacity="0.4"
            />
          </svg>
        )}
      </span>

      {/* ── Text Content ── */}
      <span className="relative z-10 font-inherit text-inherit">
        {children}
      </span>
    </span>
  );
}
