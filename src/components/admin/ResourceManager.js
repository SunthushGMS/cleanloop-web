"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ResourceFormModal from "./ResourceFormModal";
import ResourceStats from "./ResourceStats";
import StatusBadge from "./StatusBadge";

import { CATEGORY_OPTIONS, CATEGORY_LABEL } from "@/lib/resourceConstants";
const CONDITION_LABEL = { new: "New", good: "Good", fair: "Fair", poor: "Poor" };

export default function ResourceManager() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [condition, setCondition] = useState("");
  const [q, setQ] = useState("");

  const [modalTarget, setModalTarget] = useState(null);

  // Zones fetched once here, passed down to the modal, rather than
  // re-fetched every time the modal opens — the modal's zone field is a
  // dropdown sourced from this list (see ResourceFormModal.js).
  const [zones, setZones] = useState([]);

  useEffect(() => {
    fetch("/api/zones")
      .then((r) => r.json())
      .then((data) => setZones(data.zones || []))
      .catch((err) => console.error("ResourceManager loadZones error:", err));
  }, []);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (condition) params.set("condition", condition);
    if (q) params.set("q", q);

    try {
      const res = await fetch(`/api/admin/resources?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load resources");
      }
      setResources(data.resources);
    } catch (err) {
      console.error("fetchResources error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, status, condition, q]);

  useEffect(() => {
    const t = setTimeout(fetchResources, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchResources, q]);

  async function handleDelete(resource) {
    const confirmed = window.confirm(
      `Delete "${resource.name}"? This can't be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/resources/${resource._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      setResources((prev) => prev.filter((r) => r._id !== resource._id));
    } catch (err) {
      console.error("handleDelete error:", err);
      alert(err.message);
    }
  }

  function handleSaved(saved) {
    setResources((prev) => {
      const exists = prev.some((r) => r._id === saved._id);
      if (exists) {
        return prev.map((r) => (r._id === saved._id ? saved : r));
      }
      return [saved, ...prev];
    });
    setModalTarget(null);
  }

  const hasActiveFilters = category || status || condition || q;

  return (
    <div>
      {/* Filter bar — stacks to full-width rows on mobile, inline on sm: up */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, ID, or reg. number…"
          className="w-full rounded-lg border border-loop-300 bg-white px-3 py-2 text-sm text-loop-900 sm:min-w-[220px] sm:flex-1"
        />

        <div className="grid grid-cols-3 gap-2 sm:flex sm:w-auto sm:gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-loop-300 bg-white px-2 py-2 text-sm text-loop-900 sm:px-3"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-loop-300 bg-white px-2 py-2 text-sm text-loop-900 sm:px-3"
          >
            <option value="">All statuses</option>
            <option value="active">Available</option>
            <option value="in_use">In use</option>
            <option value="maintenance">Maintenance</option>
            <option value="breakdown">Breakdown</option>
            <option value="retired">Retired</option>
            <option value="out_of_stock">Out of stock</option>
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="rounded-lg border border-loop-300 bg-white px-2 py-2 text-sm text-loop-900 sm:px-3"
          >
            <option value="">All conditions</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <Link
          href="/admin/resources/allocation"
          className="btn-secondary w-full sm:ml-auto sm:w-auto"
        >
          Allocation
        </Link>

        <Link href="/admin/resources/maintenance" className="btn-secondary w-full sm:w-auto">
          Maintenance
        </Link>

        <Link href="/admin/resources/fuel" className="btn-secondary w-full sm:w-auto">
          Fuel &amp; usage
        </Link>

        <Link href="/admin/resources/lifecycle" className="btn-secondary w-full sm:w-auto">
          Lifecycle
        </Link>

        <button
          type="button"
          onClick={() => setModalTarget("new")}
          className="btn-primary w-full sm:w-auto"
        >
          + Add resource
        </button>
      </div>

      {/* Loading / error / empty states, shared by both layouts below */}
      {loading && (
        <p className="mt-6 py-8 text-center text-sm text-loop-500">Loading resources…</p>
      )}
      {!loading && error && (
        <p className="mt-6 py-8 text-center text-sm text-red-600">{error}</p>
      )}
      {!loading && !error && resources.length === 0 && (
        <p className="mt-6 py-8 text-center text-sm text-loop-500">
          No resources match these filters yet.
        </p>
      )}

      {!loading && !error && resources.length > 0 && (
        <>
          {/* Mobile: stacked cards, one per resource */}
          <div className="mt-5 space-y-3 sm:hidden">
            {resources.map((r) => (
              <div key={r._id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/admin/resources/${r._id}`}
                      className="font-medium text-loop-900 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-loop-500">
                      {CATEGORY_LABEL[r.category] || r.category}
                      {r.identifier ? ` · ${r.identifier}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-loop-500">Qty</dt>
                    <dd className="text-loop-900">{r.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-loop-500">Zone</dt>
                    <dd className="text-loop-900">{r.zone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-loop-500">Condition</dt>
                    <dd className="capitalize text-loop-900">
                      {CONDITION_LABEL[r.condition] || r.condition}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-loop-500">Reg. no.</dt>
                    <dd className="text-loop-900">{r.registrationNumber || "—"}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex justify-end gap-4 border-t border-loop-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalTarget(r)}
                    className="text-xs font-semibold text-loop-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* sm: and up — full table */}
          <div className="mt-5 hidden overflow-x-auto rounded-xl border border-loop-200 bg-white shadow-card sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-loop-100 text-xs uppercase tracking-wide text-loop-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">ID / Tag</th>
                  <th className="px-4 py-3">Reg. no.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-loop-200">
                {resources.map((r) => (
                  <tr key={r._id} className="text-loop-900">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/resources/${r._id}`} className="hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-loop-500">
                      {CATEGORY_LABEL[r.category] || r.category}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-loop-500">
                      {r.identifier || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-loop-500">
                      {r.registrationNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">{r.quantity}</td>
                    <td className="px-4 py-3 text-loop-500">{r.zone || "—"}</td>
                    <td className="px-4 py-3 capitalize text-loop-500">
                      {CONDITION_LABEL[r.condition] || r.condition}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModalTarget(r)}
                          className="text-xs font-semibold text-loop-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalTarget && (
        <ResourceFormModal
          target={modalTarget === "new" ? null : modalTarget}
          zones={zones}
          onClose={() => setModalTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}