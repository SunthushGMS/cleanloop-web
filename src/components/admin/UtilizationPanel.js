"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";

const PERIODS = [7, 30, 90];

const FLAG_STYLE = {
  underused: { label: "Underused", badge: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
  overused: { label: "Overused", badge: "bg-red-50 text-red-600", bar: "bg-red-600" },
  normal: { label: "Normal", badge: "bg-brand-50 text-brand-700", bar: "bg-brand-500" },
};

export default function UtilizationPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await fetchJson(`/api/admin/utilization?days=${days}`);
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("UtilizationPanel load error:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const periodButtons = (
    <div className="flex gap-2">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setDays(p)}
          className={days === p ? "btn-primary px-4 py-1.5" : "btn-secondary px-4 py-1.5"}
        >
          {p} days
        </button>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {periodButtons}
        <p className="py-8 text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (loading || !data) {
    return (
      <div className="space-y-4">
        {periodButtons}
        <p className="py-8 text-center text-sm text-loop-500">Loading…</p>
      </div>
    );
  }

  const { rows, thresholds } = data;
  const measured = rows.filter((r) => r.utilization !== null);
  const average = measured.length
    ? Math.round(measured.reduce((sum, r) => sum + r.utilization, 0) / measured.length)
    : null;

  return (
    <div className="space-y-6">
      {periodButtons}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card !p-4">
          <p className="text-xs uppercase tracking-wide text-loop-500">Average utilization</p>
          <p className="font-display text-2xl font-bold text-loop-950">
            {average === null ? "—" : `${average}%`}
          </p>
        </div>
        <div className="card !p-4">
          <p className="text-xs uppercase tracking-wide text-loop-500">Underused</p>
          <p className="font-display text-2xl font-bold text-loop-950">
            {rows.filter((r) => r.flag === "underused").length}
          </p>
        </div>
        <div className="card !p-4">
          <p className="text-xs uppercase tracking-wide text-loop-500">Overused</p>
          <p className="font-display text-2xl font-bold text-loop-950">
            {rows.filter((r) => r.flag === "overused").length}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="card text-sm text-loop-700">
          No vehicles yet. Add a truck, tractor, lorry or compactor under Resources.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-loop-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-loop-100 text-xs uppercase tracking-wide text-loop-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Trips</th>
                <th className="px-4 py-3">Days used</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Downtime</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-loop-200">
              {rows.map((r) => {
                const style = r.flag ? FLAG_STYLE[r.flag] : null;
                return (
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
                    <td className="px-4 py-3">{r.trips}</td>
                    <td className="px-4 py-3">{r.daysUsed}</td>
                    <td className="px-4 py-3">{r.hours || "—"}</td>
                    <td className="px-4 py-3">{r.downtimeDays} d</td>
                    <td className="px-4 py-3">{r.availableDays} d</td>
                    <td className="px-4 py-3">
                      {r.utilization === null ? (
                        "—"
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-loop-100">
                            <div
                              className={`h-full rounded-full ${
                                style ? style.bar : "bg-loop-500"
                              }`}
                              style={{ width: `${r.utilization}%` }}
                            />
                          </div>
                          <span className="w-10 font-medium">{r.utilization}%</span>
                          {style && <span className={`badge ${style.badge}`}>{style.label}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-loop-500">
        Utilization = days with an allocation ÷ available days (period days minus days in an open
        breakdown or maintenance job). Underused below {thresholds.underusedBelow}%, overused above{" "}
        {thresholds.overusedAbove}%. Flags appear once a vehicle has at least 7 days of history.
      </p>
    </div>
  );
}