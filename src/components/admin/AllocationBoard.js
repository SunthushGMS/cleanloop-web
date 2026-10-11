"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AllocationFormModal from "./AllocationFormModal";
import StatusBadge from "./StatusBadge";
import { STATUS_OPTIONS, CATEGORY_LABEL } from "@/lib/resourceConstants";

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  let data;
  try {
    data = await res.json();
  } catch {
    // The server sent HTML (a 404 or a crash page) instead of JSON.
    throw new Error(
      `${url} returned ${res.status}, not JSON. Check the API file path and the terminal running "npm run dev".`
    );
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const shiftText = (a) =>
  !a.shiftStart && !a.shiftEnd ? "No shift set" : `${a.shiftStart || "—"} – ${a.shiftEnd || "—"}`;

const routeText = (a) => (a.route ? `${a.route.zone} · ${formatDate(a.route.date)}` : "No route");

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

export default function AllocationBoard() {
  const [resources, setResources] = useState([]);
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allocating, setAllocating] = useState(null); // resource being allocated
  const [releasingId, setReleasingId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, a, h] = await Promise.all([
        getJson("/api/admin/resources"),
        getJson("/api/admin/allocations?status=active"),
        getJson("/api/admin/allocations?status=released"),
      ]);
      setResources(r.resources);
      // A resource deleted after being allocated leaves resource = null; skip those rows.
      setActive(a.allocations.filter((x) => x.resource));
      setHistory(h.allocations.filter((x) => x.resource));
    } catch (err) {
      console.error("AllocationBoard load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRelease(allocation) {
    if (!window.confirm(`Release "${allocation.resource.name}" and make it available again?`)) {
      return;
    }
    setReleasingId(allocation._id);
    try {
      const res = await fetch(`/api/admin/allocations/${allocation._id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Release failed");
      await load();
    } catch (err) {
      console.error("handleRelease error:", err);
      alert(err.message);
    } finally {
      setReleasingId(null);
    }
  }

  if (loading) {
    return <p className="mt-8 py-8 text-center text-sm text-loop-500">Loading…</p>;
  }
  if (error) {
    return <p className="mt-8 py-8 text-center text-sm text-red-600">{error}</p>;
  }

  const counts = {};
  resources.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  const available = resources.filter((r) => r.status === "active");

  return (
    <div className="mt-6 space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_OPTIONS.map((o) => (
          <div key={o.value} className="card !p-4">
            <p className="text-xs uppercase tracking-wide text-loop-500">{o.label}</p>
            <p className="font-display text-2xl font-bold text-loop-950">
              {counts[o.value] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Currently in use */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Currently allocated ({active.length})
        </h2>
        <div className="space-y-3">
          {active.length === 0 && (
            <p className="card text-sm text-loop-700">Nothing is allocated right now.</p>
          )}
          {active.map((a) => (
            <div
              key={a._id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ResourceLink resource={a.resource} />
                  <StatusBadge status="in_use" />
                </div>
                <p className="text-xs text-loop-500">
                  {CATEGORY_LABEL[a.resource.category] || a.resource.category}
                  {a.resource.registrationNumber ? ` · ${a.resource.registrationNumber}` : ""}
                </p>
                <p className="mt-2 text-sm text-loop-700">
                  {routeText(a)} · Driver: {a.driver?.name || "—"}
                </p>
                <p className="text-xs text-loop-500">
                  {formatDate(a.date)} · {shiftText(a)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRelease(a)}
                disabled={releasingId === a._id}
                className="btn-secondary disabled:opacity-60"
              >
                {releasingId === a._id ? "Releasing…" : "Release"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Available */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Available resources ({available.length})
        </h2>
        <div className="space-y-3">
          {available.length === 0 && (
            <p className="card text-sm text-loop-700">No resources are available.</p>
          )}
          {available.map((r) => (
            <div
              key={r._id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <ResourceLink resource={r} />
                <p className="text-xs text-loop-500">
                  {CATEGORY_LABEL[r.category] || r.category}
                  {r.registrationNumber ? ` · ${r.registrationNumber}` : ""}
                  {r.zone ? ` · ${r.zone}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setAllocating(r)} className="btn-primary">
                Allocate
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Allocation history
        </h2>
        {history.length === 0 ? (
          <p className="card text-sm text-loop-700">No completed allocations yet.</p>
        ) : (
          <div className="card divide-y divide-loop-100 !py-2">
            {history.slice(0, 15).map((a) => (
              <div key={a._id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ResourceLink resource={a.resource} />
                  <span className="text-xs text-loop-500">
                    Released {formatDate(a.releasedAt)}
                  </span>
                </div>
                <p className="text-xs text-loop-500">
                  {routeText(a)} · Driver: {a.driver?.name || "—"} · {formatDate(a.date)} ·{" "}
                  {shiftText(a)}
                </p>
              </div>
            ))}
          </div>
        )}
        {history.length > 15 && (
          <p className="mt-2 text-xs text-loop-500">Showing the 15 most recent.</p>
        )}
      </section>

      {allocating && (
        <AllocationFormModal
          resource={allocating}
          onClose={() => setAllocating(null)}
          onSaved={() => {
            setAllocating(null);
            load();
          }}
        />
      )}
    </div>
  );
}