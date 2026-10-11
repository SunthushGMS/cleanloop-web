"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";
import { DISPOSAL_METHOD_LABEL } from "@/lib/lifecycleConstants";
import { formatDate, money } from "@/lib/formatters";
import { RetireModal, DisposeModal } from "./LifecycleModals";

export default function RetirementPanel() {
  const [records, setRecords] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [retiring, setRetiring] = useState(false);
  const [disposing, setDisposing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, res] = await Promise.all([
        fetchJson("/api/admin/retirements"),
        fetchJson("/api/admin/resources"),
      ]);
      setRecords(r.records.filter((x) => x.resource)); // skip records of deleted resources
      setResources(res.resources);
    } catch (err) {
      console.error("RetirementPanel load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reinstate(record) {
    if (!window.confirm(`Reinstate "${record.resource.name}" as Available? Its retirement record will be removed.`)) {
      return;
    }
    setBusyId(record._id);
    try {
      await fetchJson(`/api/admin/retirements/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinstate" }),
      });
      await load();
    } catch (err) {
      console.error("RetirementPanel reinstate error:", err);
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-loop-500">Loading…</p>;
  if (error) return <p className="py-8 text-center text-sm text-red-600">{error}</p>;

  const awaiting = records.filter((r) => r.status === "retired");
  const disposed = records.filter((r) => r.status === "disposed");

  return (
    <div className="space-y-8">
      <div>
        <button type="button" onClick={() => setRetiring(true)} className="btn-primary">
          Retire a resource
        </button>
      </div>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Retired — awaiting disposal ({awaiting.length})
        </h2>
        <div className="space-y-3">
          {awaiting.length === 0 && (
            <p className="card text-sm text-loop-700">Nothing is waiting for disposal.</p>
          )}
          {awaiting.map((r) => (
            <div
              key={r._id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link href={`/admin/resources/${r.resource._id}`} className="font-medium hover:underline">
                  {r.resource.name}
                </Link>
                <p className="text-xs text-loop-500">
                  {CATEGORY_LABEL[r.resource.category] || r.resource.category}
                  {r.resource.registrationNumber ? ` · ${r.resource.registrationNumber}` : ""} ·
                  Retired {formatDate(r.retiredAt)}
                </p>
                <p className="mt-1 text-sm text-loop-700">{r.reason}</p>
                <p className="text-xs text-loop-500">
                  Condition: {r.conditionAtRetirement || "—"} · Book value at retirement:{" "}
                  {money(r.bookValueAtRetirement)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDisposing(r)}
                  className="btn-primary px-3 py-1 text-xs"
                >
                  Record disposal
                </button>
                <button
                  type="button"
                  disabled={busyId === r._id}
                  onClick={() => reinstate(r)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-60"
                >
                  Reinstate
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Disposal history ({disposed.length})
        </h2>
        {disposed.length === 0 ? (
          <p className="card text-sm text-loop-700">No disposals recorded yet.</p>
        ) : (
          <div className="card divide-y divide-loop-100 !py-2">
            {disposed.map((r) => (
              <div key={r._id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-loop-900">{r.resource.name}</span>
                  <span className="text-xs text-loop-500">{formatDate(r.disposalDate)}</span>
                </div>
                <p className="text-xs text-loop-500">
                  {DISPOSAL_METHOD_LABEL[r.disposalMethod] || r.disposalMethod}
                  {r.disposalValue !== null && r.disposalValue !== undefined
                    ? ` · Value ${money(r.disposalValue)}`
                    : ""}
                  {r.disposalReference ? ` · Ref ${r.disposalReference}` : ""} · Book value at
                  retirement {money(r.bookValueAtRetirement)}
                  {r.notes ? ` · ${r.notes}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {retiring && (
        <RetireModal
          resources={resources}
          onClose={() => setRetiring(false)}
          onSaved={() => {
            setRetiring(false);
            load();
          }}
        />
      )}
      {disposing && (
        <DisposeModal
          record={disposing}
          onClose={() => setDisposing(null)}
          onSaved={() => {
            setDisposing(null);
            load();
          }}
        />
      )}
    </div>
  );
}