"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { IconActivity, IconAlert, IconCalendar, IconRoute } from "@/components/icons";

const TYPE_LABELS = {
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  hazard: "Hazard",
  other: "Other",
};

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

const ROUTE_STATUS = {
  not_started: { label: "Not started", className: "bg-loop-100 text-loop-600" },
  in_progress: { label: "In progress", className: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", className: "bg-brand-50 text-brand-700" },
};

function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Operations dashboard: today's KPIs, the complaint queue, and a compact
 * view of today's routes. The admin tools themselves live in the sidebar.
 */
export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [progress, setProgress] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("active");
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, p, s] = await Promise.all([
        fetch("/api/complaints", { cache: "no-store" }),
        fetch("/api/routes/progress", { cache: "no-store" }),
        fetch("/api/schedules", { cache: "no-store" }),
      ]);
      const [cData, pData, sData] = await Promise.all([c.json(), p.json(), s.json()]);
      if (!c.ok) throw new Error(cData.error || "Could not load complaints");
      setComplaints(cData.complaints || []);
      if (p.ok) setProgress(pData);
      if (s.ok) setSchedules(sData.schedules || []);
    } catch (err) {
      console.error("AdminPage load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not update complaint");
      setComplaints((prev) => prev.map((c) => (c._id === id ? { ...c, status } : c)));
    } catch (err) {
      console.error("updateStatus error:", err);
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = useMemo(
    () => ({
      open: complaints.filter((c) => c.status === "open").length,
      in_progress: complaints.filter((c) => c.status === "in_progress").length,
      resolved: complaints.filter((c) => c.status === "resolved").length,
      hazards: complaints.filter((c) => c.type === "hazard" && c.status !== "resolved").length,
    }),
    [complaints]
  );

  const visible = complaints.filter((c) => {
    if (filter === "all") return true;
    if (filter === "active") return c.status !== "resolved";
    return c.status === filter;
  });

  const totals = progress?.totals;
  const pct = totals?.stops ? Math.round((totals.stopsCompleted / totals.stops) * 100) : 0;
  const published = schedules.filter((s) => (s.status || "published") === "published").length;
  const drafts = schedules.length - published;

  return (
    <div>
      <PageHeader
        title="Operations dashboard"
        description={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        actions={
          <>
            <Link href="/admin/schedules" className="btn-secondary">
              New schedule
            </Link>
            <Link href="/admin/routes" className="btn-primary">
              Assign route
            </Link>
          </>
        }
      />

      {error && (
        <div className="card mb-6 flex items-center justify-between gap-4 border-clay-500/30">
          <p className="text-sm text-clay-600">{error}</p>
          <button type="button" onClick={load} className="btn-secondary">
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open complaints"
          value={counts.open + counts.in_progress}
          hint={`${counts.open} new · ${counts.in_progress} in progress`}
          icon={IconAlert}
          tone="red"
          loading={loading}
        />
        <StatCard
          label="Routes today"
          value={totals?.routes ?? 0}
          hint={totals ? `${totals.inProgress} in progress · ${totals.completed} completed` : "—"}
          icon={IconRoute}
          tone="sky"
          loading={loading}
        />
        <StatCard
          label="Stops collected"
          value={`${pct}%`}
          hint={totals ? `${totals.stopsCompleted} of ${totals.stops} stops` : "—"}
          icon={IconActivity}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Published schedules"
          value={published}
          hint={drafts ? `${drafts} draft${drafts === 1 ? "" : "s"} waiting` : "No drafts waiting"}
          icon={IconCalendar}
          tone="amber"
          loading={loading}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* --- Complaint queue ------------------------------------------- */}
        <section className="card p-0 xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-loop-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-loop-900">Complaint queue</h2>
              <p className="text-xs text-loop-500">
                Reports from residents and crews
                {counts.hazards > 0 && (
                  <span className="ml-1 font-medium text-clay-600">
                    · {counts.hazards} unresolved hazard{counts.hazards === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-loop-100 p-1" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filter === f.key ? "bg-white text-loop-900 shadow-sm" : "text-loop-500 hover:text-loop-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-loop-100" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-loop-500">
              Nothing here. The queue is clear.
            </p>
          ) : (
            <ul className="divide-y divide-loop-100">
              {visible.map((c) => (
                <li key={c._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-loop-900">{TYPE_LABELS[c.type] || c.type}</p>
                      <StatusBadge status={c.status} />
                      {c.type === "hazard" && c.status !== "resolved" && (
                        <span className="badge bg-clay-50 text-clay-700">Priority</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-loop-600">{c.description}</p>
                    <p className="mt-1 text-xs text-loop-400">
                      {c.reportedBy?.name || "Unknown"} · {c.source === "employee" ? "Crew report" : "Resident"}
                      {c.zone && <> · {c.zone}</>} · {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <select
                    aria-label="Change status"
                    className="field-input w-full py-1.5 text-xs sm:w-36"
                    value={c.status}
                    disabled={updatingId === c._id}
                    onChange={(e) => updateStatus(c._id, e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --- Today's routes -------------------------------------------- */}
        <section className="card p-0">
          <div className="flex items-center justify-between border-b border-loop-200 px-5 py-4">
            <h2 className="text-base font-semibold text-loop-900">Today&rsquo;s routes</h2>
            <Link href="/admin/progress" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              View live
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-loop-100" />
              ))}
            </div>
          ) : !progress?.routes?.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-loop-500">No routes scheduled for today.</p>
              <Link href="/admin/routes" className="btn-secondary mt-3">
                Assign a route
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-loop-100">
              {progress.routes.map((r) => {
                const done = r.stops.filter((s) => s.completed).length;
                const routePct = r.stops.length ? Math.round((done / r.stops.length) * 100) : 0;
                const st = ROUTE_STATUS[r.status] || ROUTE_STATUS.not_started;
                return (
                  <li key={r._id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-loop-900">{r.zone}</p>
                      <span className={`badge ${st.className}`}>{st.label}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-loop-500">
                      {r.assignedTo?.name || "Unassigned"}
                      {r.vehicle && <> · {r.vehicle.name}</>}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-loop-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${routePct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-loop-600">
                        {done}/{r.stops.length}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
