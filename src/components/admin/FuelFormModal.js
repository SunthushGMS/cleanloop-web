"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";
import { FUEL_TYPE_OPTIONS, FUEL_TYPE_VALUES } from "@/lib/fuelConstants";

// Local (not UTC) yyyy-mm-dd, so "today" is right early in the morning too.
function todayInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function FuelFormModal({ vehicles, onClose, onSaved }) {
  const [form, setForm] = useState({
    resourceId: "",
    date: todayInput(),
    fuelType: "diesel",
    litres: "",
    cost: "",
    odometer: "",
    driverId: "",
    notes: "",
  });
  const [employees, setEmployees] = useState([]);
  const [lookupError, setLookupError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Drivers for the dropdown (endpoint from Step 3). Optional, so a failure isn't fatal.
  useEffect(() => {
    let cancelled = false;
    fetchJson("/api/admin/employees")
      .then((data) => {
        if (!cancelled) setEmployees(data.employees);
      })
      .catch((err) => {
        console.error("FuelFormModal employees error:", err);
        if (!cancelled) setLookupError("Could not load drivers (optional).");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  // Choosing a vehicle pre-selects its fuel type when the resource's "Fuel type" matches.
  function handleVehicleChange(resourceId) {
    const vehicle = vehicles.find((v) => v._id === resourceId);
    const saved = String(vehicle?.meta?.fuelType || "").trim().toLowerCase();
    setForm((prev) => ({
      ...prev,
      resourceId,
      fuelType: FUEL_TYPE_VALUES.includes(saved) ? saved : prev.fuelType,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await fetchJson("/api/admin/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: form.resourceId,
          date: form.date,
          fuelType: form.fuelType,
          litres: Number(form.litres),
          cost: form.cost === "" ? null : Number(form.cost),
          odometer: form.odometer === "" ? null : Number(form.odometer),
          driverId: form.driverId,
          notes: form.notes,
        }),
      });
      onSaved(data.log);
    } catch (err) {
      console.error("FuelFormModal submit error:", err);
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
          <h2 className="font-display text-lg font-bold text-loop-950">Record fuel usage</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-loop-500 hover:text-loop-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="field-label">
              Vehicle<span className="text-red-500"> *</span>
            </span>
            <select
              required
              className="field-input"
              value={form.resourceId}
              onChange={(e) => handleVehicleChange(e.target.value)}
            >
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                  {v.registrationNumber ? ` · ${v.registrationNumber}` : ""} ·{" "}
                  {CATEGORY_LABEL[v.category] || v.category}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">
                Date<span className="text-red-500"> *</span>
              </span>
              <input type="date" required className="field-input" {...bind("date")} />
            </label>
            <label className="block">
              <span className="field-label">Fuel type</span>
              <select className="field-input" {...bind("fuelType")}>
                {FUEL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">
                Litres<span className="text-red-500"> *</span>
              </span>
              <input
                type="number"
                required
                min="0.1"
                step="0.1"
                className="field-input"
                {...bind("litres")}
              />
            </label>
            <label className="block">
              <span className="field-label">Cost</span>
              <input type="number" min="0" step="0.01" className="field-input" {...bind("cost")} />
            </label>
            <label className="block">
              <span className="field-label">Odometer (km)</span>
              <input type="number" min="0" step="1" className="field-input" {...bind("odometer")} />
            </label>
            <label className="block">
              <span className="field-label">Driver</span>
              <select className="field-input" {...bind("driverId")}>
                <option value="">No driver</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {lookupError && <p className="text-xs text-loop-500">{lookupError}</p>}

          <label className="block">
            <span className="field-label">Notes</span>
            <input
              type="text"
              className="field-input"
              placeholder="e.g. Ward 4 morning round"
              {...bind("notes")}
            />
          </label>

          <p className="text-xs text-loop-500">
            Enter the odometer on every fill so km/L can be calculated. Assume a full tank.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}