"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheckCircle, IconRoute, IconTruck } from "@/components/icons";

/**
 * TodayRoute
 * ---------------------------------------------------------------------
 * Implements: "As a Collection Employee, I want to view my assigned
 * route for the day, so that I know which stops to complete."
 *
 * States handled explicitly (per TECHNICAL_HANDOFF.md item #5 — several
 * existing dashboards skip loading/error states; this one deliberately
 * doesn't):
 *   - loading   -> skeleton-ish placeholder, not a blank screen
 *   - error     -> retry button, not a silent failure
 *   - no route  -> friendly empty state ("nothing assigned today")
 *   - has route -> ordered stop list + progress bar
 *
 * Stop completion is OPTIMISTIC: we flip the UI immediately on tap, then
 * confirm with the server. If the PATCH fails (offline crew, dropped
 * signal — a real scenario for a route app), we roll the specific stop
 * back and surface an inline error instead of losing the whole screen.
 */
export default function TodayRoute() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    route: null,
  });

  // Tracks which stop _id is currently mid-PATCH, so we can disable just
  // that button (not the whole list) and show a per-stop "Saving…" state.
  const [pendingStopId, setPendingStopId] = useState(null);
  const [stopError, setStopError] = useState("");
  const [starting, setStarting] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  const fetchTodayRoute = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch("/api/routes/today", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load today's route");
      }
      setState({ loading: false, error: "", route: data.route });
    } catch (err) {
      console.error("TodayRoute fetch error:", err);
      setState({ loading: false, error: err.message, route: null });
    }
  }, []);

  useEffect(() => {
    fetchTodayRoute();
  }, [fetchTodayRoute]);

  async function completeStop(stopId) {
    if (!state.route) return;
    setStopError("");
    setPendingStopId(stopId);

    // Snapshot the previous route so we can roll back on failure without
    // an extra fetch — cheaper and faster than "PATCH then refetch"
    // (the pattern used elsewhere in this app, e.g. AdminPage.updateStatus).
    const previousRoute = state.route;

    // Optimistic update: mark the stop complete in local state right away.
    const optimisticRoute = {
      ...state.route,
      stops: state.route.stops.map((s) =>
        s._id === stopId
          ? { ...s, completed: true, completedAt: new Date().toISOString() }
          : s
      ),
    };
    setState((s) => ({ ...s, route: optimisticRoute }));

    try {
      const res = await fetch(`/api/routes/${state.route._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not mark stop complete");
      }

      // Server is the source of truth — replace the optimistic guess with
      // what the API actually persisted (e.g. the real completedAt).
      setState((s) => ({ ...s, route: data.route }));
      announceAlerts(previousRoute, data.route, data.residentsNotified);
    } catch (err) {
      console.error("completeStop error:", err);
      // Roll back to the pre-tap state so the UI never lies about what's
      // actually saved server-side.
      setState((s) => ({ ...s, route: previousRoute }));
      setStopError(err.message);
    } finally {
      setPendingStopId(null);
    }
  }

  // CPT-37: tell the crew when their action just alerted residents, so
  // they know the "truck on its way" / "collection done" message went out.
  function announceAlerts(before, after, residentsNotified) {
    if (!residentsNotified) return;
    const who = `${residentsNotified} resident${residentsNotified === 1 ? "" : "s"} in ${after.zone}`;
    if (!before.startedAt && after.startedAt && !after.completedAt) {
      setAlertMsg(`Route started: ${who} alerted that the truck is on its way.`);
    } else if (after.completedAt) {
      setAlertMsg(`Route complete: ${who} notified that collection is done.`);
    }
  }

  async function startRoute() {
    if (!state.route) return;
    setStopError("");
    setStarting(true);
    const before = state.route;
    try {
      const res = await fetch(`/api/routes/${state.route._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start route");
      setState((s) => ({ ...s, route: data.route }));
      announceAlerts(before, data.route, data.residentsNotified);
    } catch (err) {
      console.error("startRoute error:", err);
      setStopError(err.message);
    } finally {
      setStarting(false);
    }
  }

  // --- Loading state -----------------------------------------------------
  if (state.loading) {
    return (
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Today&rsquo;s route
        </h2>
        <div className="card animate-pulse">
          <div className="h-4 w-40 rounded bg-loop-200" />
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full rounded bg-loop-100" />
            <div className="h-3 w-5/6 rounded bg-loop-100" />
            <div className="h-3 w-2/3 rounded bg-loop-100" />
          </div>
        </div>
      </section>
    );
  }

  // --- Error state --------------------------------------------------------
  if (state.error) {
    return (
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Today&rsquo;s route
        </h2>
        <div className="card">
          <p className="text-sm text-red-600">{state.error}</p>
          <button
            type="button"
            onClick={fetchTodayRoute}
            className="btn-secondary mt-3 text-xs py-1.5 px-3"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  // --- Empty state (no route built for today yet) -------------------------
  if (!state.route) {
    return (
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Today&rsquo;s route
        </h2>
        <div className="card flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <IconRoute />
          </span>
          <div>
            <p className="text-sm font-medium text-loop-900">
              No route assigned for today
            </p>
            <p className="mt-0.5 text-sm text-loop-500">
              Operations hasn&rsquo;t published a route for you yet — check
              back, or reach out if you were expecting one.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // --- Happy path: route + ordered stop list -------------------------------
  const { route } = state;
  const completedCount = route.stops.filter((s) => s.completed).length;
  const totalCount = route.stops.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-loop-950">
          Today&rsquo;s route
        </h2>
        <span className="manifest-label text-loop-500">
          {/* Route dates are calendar days stored as UTC midnight. */}
          {new Date(route.date).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}
        </span>
      </div>

      <div className="card">
        {/* Header: zone + progress count */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-loop-900">{route.zone}</p>
            <p className="text-xs text-loop-500">
              {totalCount} stop{totalCount === 1 ? "" : "s"} on this route
            </p>
          </div>
          <span
            className={`badge ${
              allDone ? "bg-brand-50 text-brand-700" : "bg-loop-100 text-loop-700"
            }`}
          >
            {completedCount}/{totalCount} complete
          </span>
        </div>

        {/* CPT-39: who's on board and which truck */}
        <dl className="mt-4 grid gap-3 rounded-lg bg-loop-100 p-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <IconTruck className="mt-0.5 h-4 w-4 shrink-0 text-loop-500" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-loop-500">Truck</dt>
              <dd className="font-medium text-loop-900">
                {route.vehicle
                  ? `${route.vehicle.name}${
                      route.vehicle.meta?.plate || route.vehicle.identifier
                        ? ` (${route.vehicle.meta?.plate || route.vehicle.identifier})`
                        : ""
                    }`
                  : "Not allocated yet"}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-loop-500">Team</dt>
            <dd className="font-medium text-loop-900">
              {[route.assignedTo, ...(route.crew || [])]
                .filter(Boolean)
                .map((m, i) => (i === 0 ? `${m.name} (lead)` : m.name))
                .join(", ")}
            </dd>
          </div>
        </dl>

        {!route.startedAt && !allDone && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
            <p className="text-sm text-loop-900">
              Heading out? Starting the route alerts residents in {route.zone} that the truck is on its way.
            </p>
            <button
              type="button"
              onClick={startRoute}
              disabled={starting}
              className="btn-primary shrink-0 py-1.5 px-4 text-xs disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start route"}
            </button>
          </div>
        )}

        {route.startedAt && !route.completedAt && (
          <p className="mt-4 text-xs text-loop-500">
            Started{" "}
            {new Date(route.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {" "}— residents have been alerted.
          </p>
        )}

        {alertMsg && <p className="mt-3 text-sm font-medium text-loop-700">{alertMsg}</p>}

        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-loop-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {allDone && (
          <p className="mt-3 text-sm font-medium text-loop-700">
            All stops complete for today. Nice work.
          </p>
        )}

        {stopError && <p className="mt-3 text-sm text-red-600">{stopError}</p>}

        {/* Ordered stop list — sequence number is the stop's position in
            the array, which Mongoose preserves in insertion order (see
            Route.stops in src/lib/models/Route.js), so this IS the route
            order operations built, not an arbitrary re-sort. */}
        <ol className="mt-4 divide-y divide-loop-100">
          {route.stops.map((stop, index) => {
            const isPending = pendingStopId === stop._id;
            return (
              <li key={stop._id} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
                    stop.completed
                      ? "bg-brand-600 text-white"
                      : "border border-loop-300 text-loop-500"
                  }`}
                >
                  {stop.completed ? <IconCheckCircle className="h-4 w-4" /> : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      stop.completed
                        ? "text-loop-300 line-through"
                        : "font-medium text-loop-900"
                    }`}
                  >
                    {stop.label}
                  </p>
                  {stop.completed && stop.completedAt && (
                    <p className="mt-0.5 text-xs text-loop-500">
                      Completed{" "}
                      {new Date(stop.completedAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>

                {!stop.completed && (
                  <button
                    type="button"
                    onClick={() => completeStop(stop._id)}
                    disabled={isPending}
                    className="btn-secondary shrink-0 py-1 px-3 text-xs disabled:opacity-50"
                  >
                    {isPending ? "Saving…" : "Mark complete"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}