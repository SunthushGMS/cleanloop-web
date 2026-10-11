"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";

// Local (not UTC) yyyy-mm-dd, so "today" is right early in the morning too.
function localDateInput(d) {
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

function buildError(data, fallback) {
  const details = data?.details
    ? Object.entries(data.details)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join("; ")
    : "";
  return (data?.error || fallback) + (details ? ` (${details})` : "");
}

export default function AllocationFormModal({ resource, onClose, onSaved }) {
  const [form, setForm] = useState({
    routeId: "",
    driverId: "",
    date: localDateInput(new Date()),
    shiftStart: "",
    shiftEnd: "",
    notes: "",
  });
  const [employees, setEmployees] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data: employees (new endpoint) and routes (existing /api/routes).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [eRes, rRes] = await Promise.all([
          fetch("/api/admin/employees", { cache: "no-store" }),
          fetch("/api/routes", { cache: "no-store" }),
        ]);
        const [eData, rData] = await Promise.all([eRes.json(), rRes.json()]);
        if (!eRes.ok) throw new Error(eData.error || "Could not load employees");
        if (!rRes.ok) throw new Error(rData.error || "Could not load routes");
        if (!cancelled) {
          setEmployees(eData.employees);
          setRoutes(rData.routes);
        }
      } catch (err) {
        console.error("AllocationFormModal lookups error:", err);
        if (!cancelled) setLookupError(err.message);
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  // Picking a route sets the date to the route's date and, if no driver is
  // chosen yet, defaults the driver to the employee already assigned to it.
  function handleRouteChange(routeId) {
    const route = routes.find((r) => r._id === routeId);
    setForm((prev) => {
      const next = { ...prev, routeId };
      if (route) {
        next.date = localDateInput(new Date(route.date));
        const routeDriver = String(route.assignedTo);
        if (!prev.driverId && employees.some((e) => e.id === routeDriver)) {
          next.driverId = routeDriver;
        }
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource._id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(buildError(data, "Could not allocate"));
      onSaved(data.allocation);
    } catch (err) {
      console.error("AllocationFormModal submit error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-loop-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-loop-950">Allocate resource</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-loop-500 hover:text-loop-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-loop-700">
          <span className="font-medium">{resource.name}</span>
          <span className="text-loop-500">
            {" "}
            · {CATEGORY_LABEL[resource.category] || resource.category}
            {resource.registrationNumber ? ` · ${resource.registrationNumber}` : ""}
          </span>
        </p>

        {lookupError && <p className="mt-3 text-sm text-red-600">{lookupError}</p>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="field-label">Route (optional)</span>
            <select
              className="field-input"
              value={form.routeId}
              disabled={loadingLookups}
              onChange={(e) => handleRouteChange(e.target.value)}
            >
              <option value="">{loadingLookups ? "Loading…" : "No route"}</option>
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.zone} · {new Date(r.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Driver (optional)</span>
            <select className="field-input" disabled={loadingLookups} {...bind("driverId")}>
              <option value="">{loadingLookups ? "Loading…" : "No driver"}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="field-label">
                Date<span className="text-red-500"> *</span>
              </span>
              <input type="date" required className="field-input" {...bind("date")} />
            </label>
            <label className="block">
              <span className="field-label">Shift start</span>
              <input type="time" className="field-input" {...bind("shiftStart")} />
            </label>
            <label className="block">
              <span className="field-label">Shift end</span>
              <input type="time" className="field-input" {...bind("shiftEnd")} />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Notes</span>
            <textarea className="field-input min-h-[60px] resize-y" {...bind("notes")} />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Allocating…" : "Allocate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}