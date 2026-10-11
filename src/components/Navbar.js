"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Navbar({ user, title }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-loop-100 bg-white px-6 py-4 md:px-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-loop-500">CleanLoop</p>
        <h1 className="font-display text-lg font-semibold text-loop-950">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {user && <NotificationBell />}
        {user && (
          // The name/role chip now doubles as the entry point into account
          // settings — no extra nav item needed, one obvious click target.
          <Link href="/profile" className="text-sm text-loop-700 hover:underline">
            {user.name} &middot; <span className="capitalize">{user.role}</span>
          </Link>
        )}
        <button onClick={handleLogout} className="btn-secondary">
          Log out
        </button>
      </div>
    </header>
  );
}