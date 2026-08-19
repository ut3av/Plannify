/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        brand: ["'Playfair Display'", "Georgia", "serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "system-ui", "-apple-system", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        warm: {
          50: "#FAF8F3",
          100: "#F4EEE5",
          200: "#E8DDD0",
          300: "#D4C4B0",
          400: "#A08B7A",
          500: "#6B5344",
          600: "#4A3528",
          700: "#3D2A1E",
          800: "#20140E",
          900: "#150C07",
          950: "#0C0704",
        },
        brand: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          amber: "#b45309",
          copper: "#c2410c",
          gold: "#d97706",
          espresso: "#20140e",
        },
        surface: {
          DEFAULT: "var(--bg-surface)",
          subtle: "var(--bg-subtle)",
          main: "var(--bg-main)",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        "fade-in-delay-1": "fade-in 0.3s ease-out 0.1s both",
        "fade-in-delay-2": "fade-in 0.3s ease-out 0.2s both",
        "fade-in-delay-3": "fade-in 0.3s ease-out 0.3s both",
        "scale-in": "scale-in 0.25s ease-out both",
        "slide-down": "slide-down 0.3s ease-out both",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};