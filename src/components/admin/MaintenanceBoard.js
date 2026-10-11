"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";
import { ReportModal, CompleteModal, ReplaceModal } from "./MaintenanceModals";
import { TYPE_LABEL, recordStatusLabel } from "@/lib/maintenanceConstants";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";

const DUE_WINDOW_DAYS = 30;

const STATUS_STYLE = {
  reported: "bg-red-50 text-red-600",
  scheduled: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-500/15 text-amber-600",
  completed: "bg-loop-700/15 text-loop-700",
  cancelled: "bg-loop-100 text-loop-500",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusPill({ type, status }) {
  return (
    <span className={`badge ${STATUS_STYLE[status] || "bg-loop-100 text-loop-500"}`}>
      {recordStatusLabel(type, status)}
    </span>
  );
}

function ResourceLink({ resource }) {
  return (
    <Link
      href={`/admin/resources/${resource._id}`}
      className="font-medium text-loop-900 hover:underline"
    >
      {resource.name}
    </Link>
  );
}

const routeText = (a) => (a?.route ? `${a.route.zone} · ${formatDate(a.route.date)}` : "no route");

export default function MaintenanceBoard() {
  const [resources, setResources] = useState([]);
  const [open, setOpen] = useState([]);
  const [closed, setClosed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reporting, setReporting] = useState(null); // { mode, resourceId } | null
  const [completing, setCompleting] = useState(null); // record | null
  const [replacing, setReplacing] = useState(null); // record | null
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, o, c] = await Promise.all([
        fetchJson("/api/admin/resources"),
        fetchJson("/api/admin/maintenance?state=open"),
        fetchJson("/api/admin/maintenance?state=closed"),
      ]);
      setResources(r.resources);
      // A resource deleted after a record was made leaves resource = null; skip those.
      setOpen(o.records.filter((x) => x.resource));
      setClosed(c.records.filter((x) => x.resource));
    } catch (err) {
      console.error("MaintenanceBoard load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(record, action) {
    if (action === "cancel" && !window.confirm(`Cancel this record for "${record.resource.name}"?`)) {
      return;
    }
    setBusyId(record._id);
    try {
      await fetchJson(`/api/admin/maintenance/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (err) {
      console.error("transition error:", err);
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="mt-8 py-8 text-center text-sm text-loop-500">Loading…</p>;
  }
  if (error) {
    return <p className="mt-8 py-8 text-center text-sm text-red-600">{error}</p>;
  }

  // --- Derived data -------------------------------------------------------------------
  const now = new Date();
  const dueLimit = new Date(now.getTime() + DUE_WINDOW_DAYS * 86400000);

  const dueSoon = resources
    .filter(
      (r) => r.status !== "retired" && r.nextMaintenanceAt && new Date(r.nextMaintenanceAt) <= dueLimit
    )
    .sort((a, b) => new Date(a.nextMaintenanceAt) - new Date(b.nextMaintenanceAt));

  const overdueCount = dueSoon.filter((r) => new Date(r.nextMaintenanceAt) < now).length;
  const scheduledIds = new Set(
    open.filter((x) => x.type === "preventive").map((x) => x.resource._id)
  );

  const summary = [
    { label: "Open breakdowns", value: open.filter((x) => x.type === "breakdown").length },
    { label: "In progress", value: open.filter((x) => x.status === "in_progress").length },
    { label: "Scheduled", value: open.filter((x) => x.status === "scheduled").length },
    { label: "Service overdue", value: overdueCount },
  ];

  return (
    <div className="mt-6 space-y-8">
      {/* Summary + actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="card !p-4">
            <p className="text-xs uppercase tracking-wide text-loop-500">{s.label}</p>
            <p className="font-display text-2xl font-bold text-loop-950">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setReporting({ mode: "breakdown", resourceId: "" })}
          className="btn-primary"
        >
          Report breakdown
        </button>
        <button
          type="button"
          onClick={() => setReporting({ mode: "preventive", resourceId: "" })}
          className="btn-secondary"
        >
          Schedule maintenance
        </button>
      </div>

      {/* Open work */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Open work ({open.length})
        </h2>
        <div className="space-y-3">
          {open.length === 0 && <p className="card text-sm text-loop-700">No open work.</p>}
          {open.map((r) => {
            const busy = busyId === r._id;
            const canReplace =
              r.type === "breakdown" && r.interruptedAllocation && !r.replacementResource;
            return (
              <div key={r._id} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ResourceLink resource={r.resource} />
                      <StatusPill type={r.type} status={r.status} />
                      <span className="text-xs text-loop-500">{TYPE_LABEL[r.type]}</span>
                    </div>
                    <p className="text-xs text-loop-500">
                      {CATEGORY_LABEL[r.resource.category] || r.resource.category}
                      {r.resource.registrationNumber ? ` · ${r.resource.registrationNumber}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-loop-700">{r.description}</p>
                    <p className="mt-1 text-xs text-loop-500">
                      {r.type === "breakdown"
                        ? `Reported ${formatDate(r.reportedAt)}${
                            r.estimatedCompletion
                              ? ` · Est. completion ${formatDate(r.estimatedCompletion)}`
                              : ""
                          }`
                        : `Scheduled for ${formatDate(r.scheduledFor)}`}
                      {r.repairedBy ? ` · ${r.repairedBy}` : ""}
                    </p>
                    {r.interruptedAllocation && (
                      <p className="mt-1 text-xs text-loop-500">
                        Interrupted allocation: {routeText(r.interruptedAllocation)} · Driver:{" "}
                        {r.interruptedAllocation.driver?.name || "—"}
                      </p>
                    )}
                    {r.replacementResource && (
                      <p className="mt-1 text-xs text-loop-700">
                        Replacement: {r.replacementResource.name}
                        {r.replacementResource.registrationNumber
                          ? ` · ${r.replacementResource.registrationNumber}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canReplace && (
                      <button
                        type="button"
                        onClick={() => setReplacing(r)}
                        className="btn-secondary px-3 py-1 text-xs"
                      >
                        Assign replacement
                      </button>
                    )}
                    {r.status !== "in_progress" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => transition(r, "start")}
                        className="btn-secondary px-3 py-1 text-xs disabled:opacity-60"
                      >
                        {r.type === "breakdown" ? "Start repair" : "Start"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setCompleting(r)}
                      className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => transition(r, "cancel")}
                      className="px-2 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Service due */}
      <section>
        <h2 className="mb-1 font-display text-base font-semibold text-loop-950">
          Service due ({dueSoon.length})
        </h2>
        <p className="mb-3 text-xs text-loop-500">
          Resources with a next-maintenance date within {DUE_WINDOW_DAYS} days or overdue.
        </p>
        <div className="space-y-3">
          {dueSoon.length === 0 && <p className="card text-sm text-loop-700">Nothing due soon.</p>}
          {dueSoon.map((r) => {
            const overdue = new Date(r.nextMaintenanceAt) < now;
            return (
              <div
                key={r._id}
                className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <ResourceLink resource={r} />
                  <p className="text-xs text-loop-500">
                    {CATEGORY_LABEL[r.category] || r.category} · Due{" "}
                    <span className={overdue ? "font-semibold text-red-600" : ""}>
                      {formatDate(r.nextMaintenanceAt)}
                      {overdue ? " (overdue)" : ""}
                    </span>
                  </p>
                </div>
                {scheduledIds.has(r._id) ? (
                  <span className="text-xs text-loop-500">Already scheduled</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReporting({ mode: "preventive", resourceId: r._id })}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    Schedule
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Maintenance history
        </h2>
        {closed.length === 0 ? (
          <p className="card text-sm text-loop-700">No completed work yet.</p>
        ) : (
          <div className="card divide-y divide-loop-100 !py-2">
            {closed.slice(0, 15).map((r) => (
              <div key={r._id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ResourceLink resource={r.resource} />
                    <StatusPill type={r.type} status={r.status} />
                    <span className="text-xs text-loop-500">{TYPE_LABEL[r.type]}</span>
                  </div>
                  <span className="text-xs text-loop-500">
                    {formatDate(r.completedAt || r.updatedAt)}
                  </span>
                </div>
                <p className="text-xs text-loop-500">
                  {r.description}
                  {r.cost !== null && r.cost !== undefined ? ` · Cost ${r.cost}` : ""}
                  {r.resolution ? ` · ${r.resolution}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
        {closed.length > 15 && (
          <p className="mt-2 text-xs text-loop-500">Showing the 15 most recent.</p>
        )}
      </section>

      {reporting && (
        <ReportModal
          mode={reporting.mode}
          presetResourceId={reporting.resourceId}
          resources={resources}
          onClose={() => setReporting(null)}
          onSaved={() => {
            setReporting(null);
            load();
          }}
        />
      )}
      {completing && (
        <CompleteModal
          record={completing}
          onClose={() => setCompleting(null)}
          onSaved={() => {
            setCompleting(null);
            load();
          }}
        />
      )}
      {replacing && (
        <ReplaceModal
          record={replacing}
          resources={resources}
          onClose={() => setReplacing(null)}
          onSaved={() => {
            setReplacing(null);
            load();
          }}
        />
      )}
    </div>
  );
}