"use client";

/**
 * A small hand-drawn icon set (one
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

export function IconGrid(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

export function IconActivity(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}

export function IconMapPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconBox(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z" />
      <path d="M4 7.5 12 11l8-3.5M12 11v9" />
    </svg>
  );
}

export function IconMegaphone(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M16 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

export function IconUser(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}

export function IconMenu(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconAlert(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4 2.8 19.5h18.4Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}
