"use client";

import { useEffect, useState } from "react";
import {
  STATUS_LABEL,
  CATEGORY_LABEL,
  CONDITION_LABEL,
} from "@/lib/resourceConstants";

// Small, dependency-free horizontal bar chart. Using plain divs instead of
// a charting library (recharts/chart.js) keeps this component installable
// with zero new npm packages — swap it out later if the project already
// has a chart lib elsewhere.
function BarRow({ label, count, max, colorClass }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate text-loop-500 sm:w-28">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-loop-100">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-medium text-loop-900">{count}</span>
    </div>
  );
}

function StatCard({ title, rows, labels, colorClass }) {
  const entries = Object.entries(rows || {});
  const max = Math.max(1, ...entries.map(([, c]) => c));

  return (
    <div className="card">
      <h3 className="font-display text-sm font-semibold text-loop-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-loop-500">No data yet.</p>
        )}
        {entries.map(([key, count]) => (
          <BarRow
            key={key}
            label={labels[key] || key}
            count={count}
            max={max}
            colorClass={colorClass}
          />
        ))}
      </div>
    </div>
  );
}

export default function ResourceStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/resources/stats", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load stats");
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error("ResourceStats load error:", err);
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="mt-6 text-sm text-red-600">{error}</p>;
  }

  if (!stats) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-32 animate-pulse bg-loop-100/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Total count — a simple headline number rather than a chart of its own */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-loop-500">Total resources</p>
          <p className="font-display text-3xl font-bold text-loop-950">{stats.total}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="By category"
          rows={stats.byCategory}
          labels={CATEGORY_LABEL}
          colorClass="bg-loop-700"
        />
        <StatCard
          title="By status"
          rows={stats.byStatus}
          labels={STATUS_LABEL}
          colorClass="bg-clay-500"
        />
        <StatCard
          title="By condition"
          rows={stats.byCondition}
          labels={CONDITION_LABEL}
          colorClass="bg-loop-500"
        />
      </div>
    </div>
  );
}