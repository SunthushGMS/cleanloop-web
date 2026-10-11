/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Neutral scale ------------------------------------------------
        // `loop-*` is the app-wide neutral (text, borders, surfaces). It's now
        // the slate scale, so every existing loop-* class picks up the modern
        // palette without touching each component.
        loop: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        // --- Brand: eco emerald -------------------------------------------
        // Primary actions, active navigation, success/complete states.
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        // Amber (warning / in-progress / drafts) is Tailwind's default scale.
        // App background behind the shell's content area.
        sand: "#F8FAFC",
        // Danger — error text and "open" complaint badges.
        clay: {
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
      },
      fontFamily: {
        // Inter everywhere (headings included) for a clean product UI;
        // `display` is kept as an alias so existing font-display classes work.
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15,23,42,0.05), 0 1px 3px 0 rgba(15,23,42,0.04)",
        "card-hover": "0 4px 12px -2px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.05)",
        glow: "0 0 80px 0 rgba(16,185,129,0.25)",
      },
      backgroundImage: {
        // Landing-page hero: emerald glow on dark slate.
        "hero-glow":
          "radial-gradient(60% 50% at 82% 100%, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0) 60%), radial-gradient(80% 60% at 10% 0%, rgba(5,150,105,0.25) 0%, rgba(5,150,105,0) 55%)",
      },
      keyframes: {
        "loop-travel": {
          "0%": { offsetDistance: "0%" },
          "100%": { offsetDistance: "100%" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "loop-travel": "loop-travel 9s linear infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};
