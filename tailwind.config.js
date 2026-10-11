/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
     "./src/app/**/*.{js,jsx,ts,tsx}",
     "./src/components/**/*.{js,jsx,ts,tsx}",
   ],
  theme: {
    extend: {
      colors: {
        // --- Core "loop" scale (kept so any existing loop-* classes elsewhere in the app
        // still resolve — just remapped to the new civic/industrial palette instead of a
        // generic default blue/teal scale) ---
        loop: {
          50: "#F6F5EE",   // chalk white
          100: "#F0EEE3",  // paper (light section bg)
          200: "#E3E0D2",  // paper hairline / divider
          300: "#C7C2AC",  // muted paper text
          400: "#8FA396",  // steel-sage (secondary text on dark)
          500: "#4B564F",  // steel (secondary text on light)
          700: "#24513B",  // loop green (primary brand color)
          800: "#1A2318",  // ink-soft (raised dark surface)
          900: "#10160F",  // ink (hero / footer background)
          950: "#0A0D09",  // deepest ink, for vignette edges
        },
        // Signal amber — the single accent, used sparingly for CTAs, the vehicle
        // marker, and status highlights. Kept out of the loop scale on purpose so
        // it's never reached for by accident via loop-500 etc.
        amber: {
          400: "#EDB65C",
          500: "#E2A33B",
          600: "#C4841F",
        },
        // Dashboard page background + error/alert tone. Both were already
        // used (bg-sand, text-clay-600, bg-clay-500/15) but never defined.
        sand: "#EFEDE4",
        clay: {
          500: "#B4532A",
          600: "#9A4322",
        },
      },
      fontFamily: {
        // Wired up via CSS variables set in app/layout.js using next/font.
        display: ["var(--font-display)", "sans-serif"], // Big Shoulders Display — condensed, civic signage feel
        sans: ["var(--font-sans)", "sans-serif"],        // Inter — body copy
        mono: ["var(--font-mono)", "monospace"],         // IBM Plex Mono — route codes, stats, timestamps
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(16,22,15,0.06), 0 12px 24px -12px rgba(16,22,15,0.18)",
        glow: "0 0 80px 0 rgba(226,163,59,0.25)",
      },
      backgroundImage: {
        // Reusable cinematic hero gradient: a soft amber "headlight" glow
        // rising from the bottom-right of a near-black ink field.
        "hero-glow":
          "radial-gradient(60% 50% at 82% 100%, rgba(226,163,59,0.16) 0%, rgba(226,163,59,0) 60%), radial-gradient(80% 60% at 10% 0%, rgba(36,81,59,0.35) 0%, rgba(36,81,59,0) 55%)",
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