"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheckCircle, IconTruck } from "@/components/icons";

const REFRESH_MS = 60 * 1000;

function time(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * ZoneProgress (CPT-43, resident view)
 * ---------------------------------------------------------------------
 * "Has the truck been yet?" — today's collection progress in the
 * resident's zone. Renders nothing on days with no route, so it doesn't
 * add noise to the dashboard; refreshes every minute while a route is
 * underway.
 */
export default function ZoneProgress() {
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/routes/progress", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load collection progress");
      setRoutes(data.routes || []);
      setError("");
    } catch (err) {
      console.error("ZoneProgress load error:", err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (error || routes.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
        Today&rsquo;s collection
      </h2>
      <div className="space-y-3">
        {routes.map((r) => {
          const pct = r.totalStops ? Math.round((r.completedStops / r.totalStops) * 100) : 0;
          const headline =
            r.status === "completed"
              ? `Collection completed at ${time(r.completedAt)}`
              : r.status === "in_progress"
              ? "The truck is on its way"
              : "Collection scheduled for today — not started yet";
          return (
            <div key={r._id} className="card">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  {r.status === "completed" ? <IconCheckCircle /> : <IconTruck />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-loop-900">{headline}</p>
                  <p className="text-xs text-loop-500">
                    {r.completedStops}/{r.totalStops} stops done
                    {r.startedAt && r.status !== "completed" && <> &middot; started {time(r.startedAt)}</>}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-loop-100">
                <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {r.stops.map((s, i) => (
                  <li
                    key={i}
                    className={`badge ${s.completed ? "bg-brand-50 text-brand-700" : "bg-loop-100 text-loop-500"}`}
                  >
                    {s.completed ? "✓ " : ""}
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
