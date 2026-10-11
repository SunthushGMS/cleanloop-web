"use client";

import { useEffect, useState, useCallback } from "react";
import ResourceFormModal from "./ResourceFormModal";

const CATEGORY_LABEL = { bin: "Bin", truck: "Truck", ppe: "PPE", other: "Other" };

const STATUS_STYLE = {
  active: "bg-brand-50 text-brand-700",
  maintenance: "bg-clay-50 text-clay-700",
  retired: "bg-loop-100 text-loop-500",
  out_of_stock: "bg-red-50 text-red-600",
};

const STATUS_LABEL = {
  active: "Active",
  maintenance: "Maintenance",
  retired: "Retired",
  out_of_stock: "Out of stock",
};

export default function ResourceManager() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
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
  }, [category, status, q]);

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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-loop-200 bg-loop-50 px-3 py-2 text-sm text-loop-900"
        >
          <option value="">All categories</option>
          <option value="bin">Bins</option>
          <option value="truck">Trucks</option>
          <option value="ppe">PPE</option>
          <option value="other">Other</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-loop-200 bg-loop-50 px-3 py-2 text-sm text-loop-900"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
          <option value="out_of_stock">Out of stock</option>
        </select>

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or ID…"
          className="min-w-[200px] flex-1 rounded-lg border border-loop-200 bg-loop-50 px-3 py-2 text-sm text-loop-900"
        />

        <button
          type="button"
          onClick={() => setModalTarget("new")}
          className="btn-primary ml-auto"
        >
          + Add resource
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-loop-200 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-loop-100 text-xs uppercase tracking-wide text-loop-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">ID / Tag</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-loop-200">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-loop-500">
                  Loading resources…
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && resources.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-loop-500">
                  No resources match these filters yet.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              resources.map((r) => (
                <tr key={r._id} className="text-loop-900">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-loop-500">
                    {CATEGORY_LABEL[r.category] || r.category}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-loop-500">
                    {r.identifier || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        STATUS_STYLE[r.status] || "bg-loop-100 text-loop-500"
                      }`}
                    >
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.quantity}</td>
                  <td className="px-4 py-3 text-loop-500">{r.zone || "—"}</td>
                  <td className="px-4 py-3 capitalize text-loop-500">{r.condition}</td>
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