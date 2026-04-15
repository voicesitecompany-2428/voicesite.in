import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // ── Design System: Primary (Purple/Violet) ──────────────
        "primary":        "#5452F6",   // main CTA, active states
        "primary-dark":   "#3D3BDE",   // hover / pressed
        "primary-light":  "#EEEEFF",   // tint surface (hover bg, selected bg)

        // ── Design System: Neutral ───────────────────────────────
        "neutral-50":     "#F8F9FA",
        "neutral-100":    "#F1F3F5",
        "neutral-200":    "#E9ECEF",
        "neutral-300":    "#DEE2E6",
        "neutral-400":    "#ADB5BD",
        "neutral-500":    "#6C757D",
        "neutral-600":    "#495057",
        "neutral-700":    "#343A40",
        "neutral-800":    "#212529",
        "neutral-900":    "#111418",

        // ── Design System: Semantic ──────────────────────────────
        "success":        "#1DB954",   // green
        "success-light":  "#E8F8EE",
        "info":           "#2D9CDB",   // blue
        "info-light":     "#E8F4FB",
        "warning":        "#F5A623",   // amber
        "warning-light":  "#FEF6E7",
        "error":          "#E53935",   // red
        "error-light":    "#FDECEC",

        // ── Surfaces ─────────────────────────────────────────────
        "background-light": "#F6F7F8",
        "background-dark":  "#101922",
        "neutral-surface":  "#FFFFFF",
      },

      fontFamily: {
        // Outfit is the design system typeface
        "sans":    ["var(--font-outfit)", "sans-serif"],
        "display": ["var(--font-outfit)", "sans-serif"],
        // QR Menu template fonts
        "poppins": ["var(--font-poppins)", "sans-serif"],
        "manrope": ["var(--font-manrope)", "sans-serif"],
      },

      borderRadius: {
        // Design system border radii
        "btn":    "10px",   // buttons & inputs
        "card":   "12px",   // cards
        "card-lg":"16px",   // large cards / graphs
      },

      animation: {
        'blob':       'blob 7s infinite',
        'spin-slow':  'spin 3s linear infinite',
        'float':      'float 6s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        blob: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '33%':  { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%':  { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
