"use client";

import { useId } from "react";

/**
 * CleanLoopLogo
 * --------------------------------------------------------------------------
 * The mark is a single open loop — not a closed circle — because the product's
 * whole thesis is a route that keeps moving, not a sealed cycle. The gap in
 * the loop is "closed" by a small arrowhead re-entering it, and a solid dot
 * marks the loop's one fixed stop (its "resident" origin point). Same two
 * ideas the hero RouteMap uses, just compressed down to icon scale so the
 * logo and the hero diagram read as the same visual system.
 *
 * Props:
 *  - variant: "lockup" (mark + wordmark, default) | "mark" (icon only)
 *  - tone:    "dark"  -> wordmark in loop-50, for use on the dark hero/footer
 *             "light" -> wordmark in loop-900, for use on paper sections
 *  - size:    px height of the mark. Wordmark scales relative to it.
 */
export default function CleanLoopLogo({
  variant = "lockup",
  tone = "light",
  size = 32,
  className = "",
}) {
  const wordmarkColor = tone === "dark" ? "#FFFFFF" : "#0F172A";
  // Unique per instance: two logos on one page (e.g. desktop sidebar + mobile
  // drawer) must not share a gradient id, or one renders without its stroke.
  const gradId = `cl-mark-grad-${useId().replace(/:/g, "")}`;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        role="img"
        aria-label="CleanLoop"
      >
        <defs>
          {/* Deep -> light emerald sweep: the loop "travels" from ops-green into
              light emerald, the same direction the hero's vehicle marker moves. */}
          <linearGradient id={gradId} x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#047857" />
            <stop offset="1" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* The open loop. Drawn as one continuous arc (not a full circle) with
            a ~46° gap on the lower-right, which the arrowhead re-enters. */}
        <path
          d="M20 5.5
             A14.5 14.5 0 1 1 8.2 28.4"
          stroke={`url(#${gradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Arrowhead: closes the gap, gives the loop a direction of travel. */}
        <path
          d="M8.2 28.4 L6.6 21.7 L13 24.6 Z"
          fill="#34D399"
        />

        {/* Fixed stop marker at the top of the loop. */}
        <circle cx="20" cy="5.5" r="3.1" fill="#0F172A" />
        <circle cx="20" cy="5.5" r="1.35" fill="#FFFFFF" />
      </svg>

      {variant === "lockup" && (
        <span
          className="font-display text-[1.35rem] font-bold leading-none tracking-tight"
          style={{ color: wordmarkColor }}
        >
          Clean<span style={{ color: "#10B981" }}>Loop</span>
        </span>
      )}
    </span>
  );
}