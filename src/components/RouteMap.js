"use client";

/**
 * RouteMap — the page's signature element.
 * --------------------------------------------------------------------------
 * This is the literal illustration of the headline: "one loop, four roles."
 * A single closed route touches four stops (Resident -> Operations -> Crew
 * -> Volunteer) and a marker travels it continuously, forever, because the
 * product's whole premise is that the loop never actually stops.
 *
 * Implementation notes (read before editing the path):
 *  - ROUTE_D is used TWICE: once as the visible <path> stroke inside the SVG,
 *    and again as a CSS `offset-path` on the plain <div> marker below the
 *    SVG. Both must stay byte-for-byte identical or the marker will drift
 *    off the visible line.
 *  - The wrapper and the <svg> both use the *same explicit pixel* width/height
 *    (520x420) rather than percentages. offset-path coordinates are resolved
 *    in the marker's own containing block, so if the SVG were allowed to
 *    scale independently (e.g. via viewBox + 100% width) the dot would no
 *    longer track the drawn line. Keep them locked together.
 *  - Stops are plain data below so labels/roles can be edited without
 *    touching path math.
 */

const ROUTE_D =
  "M70,90 C70,50 150,40 250,45 C370,50 440,90 440,150 C440,210 400,230 370,270 " +
  "C340,310 270,340 190,335 C110,330 60,300 55,230 C50,170 70,120 70,90 Z";

const STOPS = [
  { code: "R-01", role: "Resident", x: 55, y: 230, anchor: "end", dx: -14, dy: 4 },
  { code: "O-02", role: "Operations", x: 250, y: 45, anchor: "middle", dx: 0, dy: -18 },
  { code: "C-03", role: "Collection crew", x: 440, y: 150, anchor: "start", dx: 14, dy: 4 },
  { code: "V-04", role: "Volunteer", x: 190, y: 335, anchor: "middle", dx: 0, dy: 28 },
];

export default function RouteMap({ className = "" }) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: 520, height: 420, maxWidth: "100%" }}
      aria-hidden="true"
    >
      <svg
        width="520"
        height="420"
        viewBox="0 0 520 420"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="route-grad" x1="55" y1="45" x2="440" y2="335" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6EE7B7" />
            <stop offset="0.55" stopColor="#10B981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* Faint full route, always visible, so the shape reads even before
            the eye catches the moving marker. */}
        <path d={ROUTE_D} fill="none" stroke="url(#route-grad)" strokeWidth="1.5" opacity="0.9" />

        {/* Dashed overlay for a "surveyed route" texture, cheap and cinematic. */}
        <path
          d={ROUTE_D}
          fill="none"
          stroke="#F8FAFC"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="1 7"
        />

        {STOPS.map((s) => (
          <g key={s.code}>
            <circle cx={s.x} cy={s.y} r="5.5" fill="#0F172A" stroke="#34D399" strokeWidth="1.5" />
            <text
              x={s.x + s.dx}
              y={s.y + s.dy}
              textAnchor={s.anchor}
              className="font-mono"
              fontSize="10"
              fill="#E2E8F0"
              opacity="0.85"
            >
              {s.code}
            </text>
            <text
              x={s.x + s.dx}
              y={s.y + s.dy + 13}
              textAnchor={s.anchor}
              className="font-sans"
              fontSize="11.5"
              fontWeight="600"
              fill="#F8FAFC"
            >
              {s.role}
            </text>
          </g>
        ))}
      </svg>

      {/* The traveling vehicle marker. Plain div, animated purely with CSS
          (see tailwind.config.js -> animation.loop-travel), no JS/rAF needed. */}
      <div
        className="absolute left-0 top-0 h-3 w-3 animate-loop-travel"
        style={{
          offsetPath: `path("${ROUTE_D}")`,
          offsetRotate: "0deg",
        }}
      >
        <span className="block h-3 w-3 rounded-full bg-brand-400 shadow-glow" />
      </div>
    </div>
  );
}