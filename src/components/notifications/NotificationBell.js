"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconBell } from "@/components/icons";

// No WebSocket layer in this app (see README "Next steps"), so the bell
// polls. 30s is frequent enough for "truck is on its way" to feel timely
// without hammering the API from every open tab.
const POLL_MS = 30 * 1000;

function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * NotificationBell (CPT-28)
 * ---------------------------------------------------------------------
 * Unread badge + dropdown feed, rendered in the shared Navbar for every
 * role. Reads GET /api/notifications; marks read via PATCH.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
    } catch (err) {
      console.error("NotificationBell load error:", err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch (err) {
      console.error("NotificationBell markRead error:", err);
      load();
    }
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch (err) {
      console.error("NotificationBell markAllRead error:", err);
      load();
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-[3px] text-loop-700 hover:bg-loop-50"
      >
        <IconBell />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-semibold text-loop-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[3px] border border-loop-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-loop-100 px-4 py-3">
            <p className="text-sm font-semibold text-loop-950">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-loop-700 hover:underline disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}

          {!error && notifications.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-loop-500">
              You&rsquo;re all caught up.
            </p>
          )}

          <ul className="max-h-96 divide-y divide-loop-100 overflow-y-auto">
            {notifications.map((n) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.readAt ? "text-loop-700" : "font-semibold text-loop-950"}`}>
                      {n.title}
                    </p>
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Unread" />
                    )}
                  </div>
                  {n.message && <p className="mt-0.5 text-xs text-loop-500">{n.message}</p>}
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-loop-400">
                    {timeAgo(n.createdAt)}
                  </p>
                </>
              );
              return (
                <li key={n._id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        if (!n.readAt) markRead(n._id);
                        setOpen(false);
                      }}
                      className="block px-4 py-3 hover:bg-loop-50"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !n.readAt && markRead(n._id)}
                      className="block w-full px-4 py-3 text-left hover:bg-loop-50"
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
