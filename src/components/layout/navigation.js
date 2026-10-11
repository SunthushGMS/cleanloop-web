import {
  IconActivity,
  IconBox,
  IconCalendar,
  IconClipboard,
  IconFlag,
  IconGrid,
  IconMapPin,
  IconMegaphone,
  IconRoute,
  IconUser,
} from "@/components/icons";

/**
 * Sidebar navigation per role. `exact` marks links that should only be
 * active on their own path (a role's home), not on everything beneath it.
 */
export const ROLE_LABELS = {
  admin: "Operations",
  employee: "Collection crew",
  resident: "Resident",
  volunteer: "Volunteer",
};

const ACCOUNT = { href: "/profile", label: "Account & security", icon: IconUser };
const CAMPAIGNS = { href: "/campaigns", label: "Community campaigns", icon: IconMegaphone };

export const NAVIGATION = {
  admin: [
    {
      section: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: IconGrid, exact: true },
        { href: "/admin/progress", label: "Live progress", icon: IconActivity },
      ],
    },
    {
      section: "Operations",
      items: [
        { href: "/admin/routes", label: "Routes", icon: IconRoute },
        { href: "/admin/schedules", label: "Schedules", icon: IconCalendar },
        { href: "/admin/zones", label: "Zones", icon: IconMapPin },
        { href: "/admin/resources", label: "Resources", icon: IconBox },
      ],
    },
    { section: "Community", items: [CAMPAIGNS] },
    { section: "Settings", items: [ACCOUNT] },
  ],
  employee: [
    {
      section: "Field work",
      items: [{ href: "/employee", label: "Today's route", icon: IconRoute, exact: true }],
    },
    { section: "Community", items: [CAMPAIGNS] },
    { section: "Settings", items: [ACCOUNT] },
  ],
  resident: [
    {
      section: "My area",
      items: [
        { href: "/resident", label: "Dashboard", icon: IconGrid, exact: true },
        { href: "/resident/complaints", label: "My reports", icon: IconFlag },
      ],
    },
    { section: "Community", items: [CAMPAIGNS] },
    { section: "Settings", items: [ACCOUNT] },
  ],
  volunteer: [
    {
      section: "Community",
      items: [
        { href: "/volunteer", label: "Dashboard", icon: IconClipboard, exact: true },
        CAMPAIGNS,
      ],
    },
    { section: "Settings", items: [ACCOUNT] },
  ],
};

export function isActive(item, pathname) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The nav item matching the current path (for the top-bar breadcrumb). */
export function currentItem(role, pathname) {
  const items = (NAVIGATION[role] || []).flatMap((s) => s.items);
  return items.find((item) => isActive(item, pathname)) || null;
}
