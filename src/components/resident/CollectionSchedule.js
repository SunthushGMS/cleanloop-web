"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WASTE_LABELS, formatTimeWindow, nextOccurrence } from "@/lib/schedule";

const WASTE_STYLES = {
  general: "bg-loop-100 text-loop-700",
  recycling: "bg-sky-50 text-sky-700",
  organic: "bg-brand-50 text-brand-700",
};

function relativeDay(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date - today) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/**
 * CollectionSchedule (CPT-36 Collection Schedule Viewing)
 * ---------------------------------------------------------------------
 * The resident's published weekly schedule for their zone, Monday to
 * Sunday, with the next upcoming collection pulled out on top so "when
 * do I put the bins out?" is answered at a glance.
 */
export default function CollectionSchedule({ zone }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/schedules", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your schedule");
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error("CollectionSchedule load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Upcoming collections sorted by actual date (the API already returns
  // them Monday→Sunday for the weekly table below).
  const upcoming = useMemo(() => {
    const now = new Date();
    return schedules
      .map((s) => ({ ...s, next: nextOccurrence(s.dayOfWeek, now, s.endTime) }))
      .sort((a, b) => a.next - b.next || (a.startTime || "").localeCompare(b.startTime || ""));
  }, [schedules]);

  const next = upcoming[0];
  // Every collection that happens on that same next day (e.g. general +
  // recycling both on Tuesday).
  const nextDay = next ? upcoming.filter((s) => +s.next === +next.next) : [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-loop-950">
          Your collection schedule
        </h2>
        {zone && <span className="manifest-label text-loop-500">{zone}</span>}
      </div>

      {loading && (
        <div className="card animate-pulse">
          <div className="h-4 w-48 rounded bg-loop-200" />
          <div className="mt-4 h-3 w-full rounded bg-loop-100" />
        </div>
      )}

      {!loading && error && (
        <div className="card">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={load} className="btn-secondary mt-3 py-1.5 px-3 text-xs">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && schedules.length === 0 && (
        <p className="card text-sm text-loop-700">
          No schedule has been published for your zone yet. You&rsquo;ll get a
          notification as soon as one is.
        </p>
      )}

      {!loading && !error && next && (
        <div className="space-y-4">
          <div className="card border-l-4 border-l-brand-500">
            <p className="manifest-label">Next collection</p>
            <p className="mt-1 font-display text-xl font-bold text-loop-950 sm:text-2xl">
              {relativeDay(next.next)} &middot;{" "}
              {next.next.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {nextDay.map((s) => (
                <li key={s._id} className={`badge ${WASTE_STYLES[s.wasteType] || WASTE_STYLES.general}`}>
                  {WASTE_LABELS[s.wasteType] || s.wasteType}
                  {formatTimeWindow(s) && <> &middot; {formatTimeWindow(s)}</>}
                </li>
              ))}
            </ul>
          </div>

          <div className="card divide-y divide-loop-100">
            {schedules.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-loop-900">{s.dayOfWeek}</p>
                  {s.notes && <p className="mt-0.5 text-xs text-loop-500">{s.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {formatTimeWindow(s) && (
                    <span className="font-mono text-xs text-loop-500">{formatTimeWindow(s)}</span>
                  )}
                  <span className={`badge ${WASTE_STYLES[s.wasteType] || WASTE_STYLES.general}`}>
                    {WASTE_LABELS[s.wasteType] || s.wasteType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
