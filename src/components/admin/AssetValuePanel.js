"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";
import { METHOD_LABEL } from "@/lib/lifecycleConstants";
import { formatDate, money } from "@/lib/formatters";
import { SettingsModal } from "./LifecycleModals";

export default function AssetValuePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await fetchJson("/api/admin/lifecycle"));
    } catch (err) {
      console.error("AssetValuePanel load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="py-8 text-center text-sm text-loop-500">Loading…</p>;
  if (error) return <p className="py-8 text-center text-sm text-red-600">{error}</p>;

  const { rows, summary } = data;

  const cards = [
    { label: "Total purchase cost", value: money(summary.totalCost) },
    { label: "Current book value", value: money(summary.totalBookValue) },
    { label: "Accumulated depreciation", value: money(summary.totalAccumulated) },
    { label: "Replacement recommended", value: summary.needReplacement },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card !p-4">
            <p className="text-xs uppercase tracking-wide text-loop-500">{c.label}</p>
            <p className="font-display text-xl font-bold text-loop-950">{c.value}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="card text-sm text-loop-700">No resources yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-[3px] border border-loop-200">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-loop-100 text-xs uppercase tracking-wide text-loop-500">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Purchased</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Age / life</th>
                <th className="px-4 py-3">Accumulated</th>
                <th className="px-4 py-3">Book value</th>
                <th className="px-4 py-3 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-loop-200">
              {rows.map((r) => {
                const d = r.depreciation;
                return (
                  <tr key={r.id} className="align-top text-loop-900">
                    <td className="px-4 py-3">
                      <Link href={`/admin/resources/${r.id}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      <p className="text-xs text-loop-500">
                        {CATEGORY_LABEL[r.category] || r.category}
                        {r.registrationNumber ? ` · ${r.registrationNumber}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{formatDate(r.purchaseDate)}</td>
                    {d.complete ? (
                      <>
                        <td className="px-4 py-3">{money(d.cost)}</td>
                        <td className="px-4 py-3">
                          {d.ageYears} / {d.usefulLife} yrs
                          <p className="text-xs text-loop-500">
                            {METHOD_LABEL[d.method]}
                            {d.usingDefaults.usefulLife ? " · default life" : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">{money(d.accumulated)}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{money(d.bookValue)}</span>
                          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-loop-100">
                            <div
                              className="h-full rounded-full bg-clay-500"
                              style={{ width: `${d.percentDepreciated}%` }}
                            />
                          </div>
                          <p className="text-xs text-loop-500">
                            {d.percentDepreciated}% depreciated
                            {d.fullyDepreciated ? " · fully" : ""}
                          </p>
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} className="px-4 py-3 text-xs text-loop-500">
                        Add the {d.missing.join(" and ")} to this resource (Edit) to calculate its
                        value.
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        className="text-xs font-semibold text-loop-700 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-loop-500">
        Straight-line: cost − (cost − salvage) ÷ life × age. Declining balance: cost × (1 − 2 ÷
        life)^age, never below salvage. Retired resources are excluded.
      </p>

      {editing && (
        <SettingsModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}