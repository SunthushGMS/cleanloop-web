"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL, VEHICLE_CATEGORIES } from "@/lib/resourceConstants";
import { FUEL_TYPE_LABEL } from "@/lib/fuelConstants";
import FuelFormModal from "./FuelFormModal";

// Local "YYYY-MM" for the month picker's default.
function currentMonth() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
}

// Fuel dates are date-only values stored as UTC midnight, so display them in UTC.
const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const num = (value, digits = 1) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export default function FuelPanel() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [s, l, r] = await Promise.all([
        fetchJson(`/api/admin/fuel/summary?month=${month}`),
        fetchJson(`/api/admin/fuel?month=${month}`),
        fetchJson("/api/admin/resources"),
      ]);
      setSummary(s);
      setLogs(l.logs.filter((x) => x.resource)); // skip logs of deleted resources
      setVehicles(
        r.resources.filter(
          (x) => VEHICLE_CATEGORIES.includes(x.category) && x.status !== "retired"
        )
      );
    } catch (err) {
      console.error("FuelPanel load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function handleDelete(log) {
    if (!window.confirm(`Delete this fuel entry for "${log.resource.name}"?`)) return;
    setDeletingId(log._id);
    try {
      await fetchJson(`/api/admin/fuel/${log._id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      console.error("FuelPanel delete error:", err);
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const controls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <label className="block">
        <span className="field-label">Month</span>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="field-input sm:w-48"
        />
      </label>
      <button
        type="button"
        onClick={() => setShowForm(true)}
        disabled={vehicles.length === 0}
        className="btn-primary disabled:opacity-60"
      >
        Record fuel usage
      </button>
    </div>
  );

  if (loading) {
    return <p className="py-8 text-center text-sm text-loop-500">Loading…</p>;
  }
  if (error) {
    return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  }

  const { rows, totals } = summary;

  return (
    <div className="space-y-8">
      {controls}

      {vehicles.length === 0 && (
        <p className="card text-sm text-loop-700">
          No vehicles yet. Add a truck, tractor, lorry or compactor under Resources first.
        </p>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card !p-4">
          <p className="text-xs uppercase tracking-wide text-loop-500">Fuel used</p>
          <p className="font-display text-2xl font-bold text-loop-950">{num(totals.litres)} L</p>
        </div>
        <div className="card !p-4">
          <p className="text-xs uppercase tracking-wide text-loop-500">Fuel cost</p>
          <p className="font-display text-2xl font-bold text-loop-950">
            {totals.cost === null ? "—" : num(totals.cost, 2)}
          </p>
        </div>
        <div className="card !p-4">
          <p className="text-xs uppercase tracking-wide text-loop-500">Vehicles fuelled</p>
          <p className="font-display text-2xl font-bold text-loop-950">{totals.vehicles}</p>
        </div>
      </div>

      {/* Per-vehicle consumption */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Consumption by vehicle
        </h2>
        {rows.length === 0 ? (
          <p className="card text-sm text-loop-700">No fuel recorded for this month.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-loop-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-loop-100 text-xs uppercase tracking-wide text-loop-500">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Fills</th>
                  <th className="px-4 py-3">Litres</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Distance (km)</th>
                  <th className="px-4 py-3">Avg km/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-loop-200">
                {rows.map((r) => (
                  <tr key={r.id} className="text-loop-900">
                    <td className="px-4 py-3">
                      <Link href={`/admin/resources/${r.id}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      <p className="text-xs text-loop-500">
                        {CATEGORY_LABEL[r.category] || r.category}
                        {r.registrationNumber ? ` · ${r.registrationNumber}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{r.fills}</td>
                    <td className="px-4 py-3">{num(r.litres)}</td>
                    <td className="px-4 py-3">{r.cost === null ? "—" : num(r.cost, 2)}</td>
                    <td className="px-4 py-3">{r.distance ? num(r.distance, 0) : "—"}</td>
                    <td className="px-4 py-3">
                      {r.kmPerL === null ? "—" : num(r.kmPerL, 2)}
                      {r.highConsumption && (
                        <span
                          className="badge ml-2 bg-red-50 text-red-600"
                          title={`Usually ${num(r.usualKmPerL, 2)} km/L`}
                        >
                          High consumption
                        </span>
                      )}
                      {r.highConsumption && (
                        <p className="text-xs text-loop-500">
                          usually {num(r.usualKmPerL, 2)} km/L
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-loop-500">
          km/L needs at least two odometer readings and assumes each fill tops up the tank.
        </p>
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">Fuel history</h2>
        {logs.length === 0 ? (
          <p className="card text-sm text-loop-700">No entries for this month.</p>
        ) : (
          <div className="card divide-y divide-loop-100 !py-2">
            {logs.map((l) => (
              <div
                key={l._id}
                className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-loop-900">
                    {l.resource.name}
                    <span className="ml-2 text-xs font-normal text-loop-500">
                      {formatDate(l.date)}
                    </span>
                  </p>
                  <p className="text-xs text-loop-500">
                    {num(l.litres)} L {FUEL_TYPE_LABEL[l.fuelType] || l.fuelType}
                    {l.cost !== null && l.cost !== undefined ? ` · Cost ${num(l.cost, 2)}` : ""}
                    {l.odometer !== null && l.odometer !== undefined
                      ? ` · Odometer ${num(l.odometer, 0)} km`
                      : ""}
                    {l.driver?.name ? ` · ${l.driver.name}` : ""}
                    {l.notes ? ` · ${l.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(l)}
                  disabled={deletingId === l._id}
                  className="self-start text-xs font-semibold text-red-600 hover:underline disabled:opacity-60 sm:self-auto"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <FuelFormModal
          vehicles={vehicles}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}