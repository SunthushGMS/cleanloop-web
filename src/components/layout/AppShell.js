"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CleanLoopLogo from "@/components/CleanLoopLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import { IconClose, IconLogout, IconMenu } from "@/components/icons";
import { NAVIGATION, ROLE_LABELS, currentItem, isActive } from "@/components/layout/navigation";

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/**
 * AppShell
 * ---------------------------------------------------------------------
 * The signed-in application frame for every role: a dark sidebar with
 * role-specific navigation (a slide-in drawer below `lg`), and a sticky
 * top bar with the current section, notifications, and the user.
 * Replaces the old single-row Navbar.
 */
export default function AppShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const role = user?.role;
  const sections = NAVIGATION[role] || [];
  const active = currentItem(role, pathname);

  const sidebar = (
    <div className="flex h-full flex-col bg-loop-900 text-loop-300">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link href={sections[0]?.items[0]?.href || "/"} aria-label="CleanLoop home">
          <CleanLoopLogo tone="dark" size={28} />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="rounded-lg p-1.5 text-loop-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <IconClose />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
        {sections.map((section) => (
          <div key={section.section}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-loop-500">
              {section.section}
            </p>
            <ul className="mt-2 space-y-0.5">
              {section.items.map((item) => {
                const on = isActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={on ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        on
                          ? "bg-brand-600/15 text-white"
                          : "text-loop-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          on ? "text-brand-400" : "text-loop-500 group-hover:text-loop-300"
                        }`}
                      />
                      {item.label}
                      {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-loop-400">{ROLE_LABELS[role] || role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-loop-400 hover:bg-white/5 hover:text-white"
              aria-label="Log out"
              title="Log out"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-sand">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-loop-950/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-loop-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="-ml-1 rounded-lg p-2 text-loop-500 hover:bg-loop-100 lg:hidden"
            aria-label="Open navigation"
          >
            <IconMenu />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-2 text-sm">
              <li className="hidden text-loop-500 sm:block">{ROLE_LABELS[role] || "CleanLoop"}</li>
              {active && (
                <>
                  <li className="hidden text-loop-300 sm:block" aria-hidden="true">/</li>
                  <li className="truncate font-semibold text-loop-900">{active.label}</li>
                </>
              )}
            </ol>
          </nav>

          {user && <NotificationBell />}
          {user && (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-loop-100"
              title="Account & security"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initials(user.name)}
              </span>
              <span className="hidden text-sm font-medium text-loop-700 md:block">
                {user.name.split(" ")[0]}
              </span>
            </Link>
          )}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
