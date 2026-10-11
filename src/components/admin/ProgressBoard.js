"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheckCircle, IconRefresh } from "@/components/icons";

const REFRESH_MS = 30 * 1000;

const STATUS = {
  not_started: { label: "Not started", className: "bg-loop-100 text-loop-500" },
  in_progress: { label: "In progress", className: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", className: "bg-brand-50 text-brand-700" },
};

function todayISODate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 10);
}

function time(value) {
  return value
    ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;
}

/**
 * ProgressBoard (CPT-43 Collection Progress Tracking)
 * ---------------------------------------------------------------------
 * Ops' live view of a day's routes: fleet totals, then each route's
 * status, crew, truck, and stop-by-stop completion. Polls every 30s while
 * viewing today (there's no push channel in this app), and can look back
 * at any past date.
 */
export default function ProgressBoard() {
  const [date, setDate] = useState(todayISODate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const isToday = date === todayISODate();

  const load = useCallback(async () => {
    setError("");
    try {
      // Today uses the server's own "today" so it matches the crews' view.
      const res = await fetch(`/api/routes/progress${isToday ? "" : `?date=${date}`}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load progress");
      setData(json);
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("ProgressBoard load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, isToday]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!isToday) return undefined;
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load, isToday]);

  const totals = data?.totals;
  const pct = totals && totals.stops ? Math.round((totals.stopsCompleted / totals.stops) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label className="field-label" htmlFor="progress-date">
            Date
          </label>
          <input
            id="progress-date"
            type="date"
            className="field-input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISODate())}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-loop-500">
          {updatedAt && (
            <span>
              Updated {time(updatedAt)}
              {isToday && " · refreshes every 30s"}
            </span>
          )}
          <button type="button" onClick={load} className="btn-secondary py-1.5 px-3 text-xs">
            <IconRefresh className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {loading && <p className="card text-sm text-loop-500">Loading progress…</p>}
      {!loading && error && <p className="card text-sm text-red-600">{error}</p>}

      {!loading && !error && totals && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Routes" value={totals.routes} />
            <Stat label="Not started" value={totals.notStarted} />
            <Stat label="In progress" value={totals.inProgress} />
            <Stat label="Completed" value={totals.completed} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-loop-900">Stops collected</span>
              <span className="font-mono text-loop-700">
                {totals.stopsCompleted}/{totals.stops} &middot; {pct}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-loop-100">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {data.routes.length === 0 ? (
            <p className="card text-sm text-loop-700">
              No routes for this date.{" "}
              <a href="/admin/routes" className="font-medium underline">
                Build one in Route builder
              </a>
              .
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.routes.map((route) => (
                <RouteProgressCard key={route._id} route={route} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card py-4">
      <p className="manifest-label">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-loop-950">{value}</p>
    </div>
  );
}

function RouteProgressCard({ route }) {
  const done = route.stops.filter((s) => s.completed).length;
  const total = route.stops.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const status = STATUS[route.status] || STATUS.not_started;
  const nextStop = route.stops.find((s) => !s.completed);
  const crew = [route.assignedTo?.name, ...(route.crew || []).map((c) => c.name)].filter(Boolean);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-loop-900">{route.zone}</p>
          <p className="mt-0.5 text-xs text-loop-500">
            {crew.join(", ") || "No crew"} &middot;{" "}
            {route.vehicle ? route.vehicle.name : "No truck"}
          </p>
        </div>
        <span className={`badge shrink-0 ${status.className}`}>{status.label}</span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-loop-100">
        <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-loop-500">
        <span>
          {done}/{total} stops
          {nextStop && route.status === "in_progress" && <> &middot; next: {nextStop.label}</>}
        </span>
        <span>
          {route.startedAt && <>Started {time(route.startedAt)}</>}
          {route.completedAt && <> &middot; Finished {time(route.completedAt)}</>}
        </span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {route.stops.map((stop, i) => (
          <li key={stop._id} className="flex items-center gap-2 text-sm">
            {stop.completed ? (
              <IconCheckCircle className="h-4 w-4 shrink-0 text-brand-600" />
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center font-mono text-[10px] text-loop-400">
                {i + 1}
              </span>
            )}
            <span className={stop.completed ? "text-loop-400 line-through" : "text-loop-900"}>
              {stop.label}
            </span>
            {stop.completedAt && (
              <span className="ml-auto font-mono text-[11px] text-loop-400">{time(stop.completedAt)}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
