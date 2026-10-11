"use client";

/**
 * A small hand-drawn icon set, kept intentionally narrow (8 icons, one
 * stroke weight, one style) so it reads as a designed system rather than a
 * grab-bag from a generic icon library. All icons: 24x24 viewBox, 1.6 stroke.
 */
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconHouse(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function IconClipboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="1.5" />
      <path d="M9 4.5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}

export function IconTruck(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h10v9H3z" />
      <path d="M13 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}

export function IconLeaf(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 19c8 1 14-5 14-14-9 0-14 6-14 14Z" />
      <path d="M5 19c2-4 5-7 9-9" />
    </svg>
  );
}

export function IconFlag(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 21V4" />
      <path d="M6 5h11l-3 3.5L17 12H6" />
    </svg>
  );
}

export function IconRoute(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="5.5" cy="18.5" r="1.8" />
      <circle cx="18.5" cy="5.5" r="1.8" />
      <path d="M7 18.5h6a3.5 3.5 0 0 0 0-7H11a3.5 3.5 0 0 1 0-7h6.5" />
    </svg>
  );
}

export function IconCheckCircle(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3 11 14.8l5-5.6" />
    </svg>
  );
}

export function IconRefresh(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" />
      <path d="M4 20v-4.5h4.5" />
    </svg>
  );
}

export function IconBell(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}
