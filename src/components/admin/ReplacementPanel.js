"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL } from "@/lib/resourceConstants";
import { REPLACEMENT_STATUS_LABEL, OPEN_REPLACEMENT_STATUSES } from "@/lib/lifecycleConstants";
import { formatDate, money } from "@/lib/formatters";
import { RequestModal, CompleteReplacementModal } from "./LifecycleModals";

const STATUS_STYLE = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-600",
  completed: "bg-loop-700/15 text-loop-700",
  cancelled: "bg-loop-100 text-loop-500",
};

const LEVEL = {
  replace: { label: "Replacement recommended", style: "bg-red-50 text-red-600" },
  watch: { label: "Watch", style: "bg-amber-500/15 text-amber-600" },
};

export default function ReplacementPanel() {
  const [rows, setRows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [requesting, setRequesting] = useState(null); // lifecycle row | null
  const [completing, setCompleting] = useState(null); // request | null
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [l, r, res] = await Promise.all([
        fetchJson("/api/admin/lifecycle"),
        fetchJson("/api/admin/replacements"),
        fetchJson("/api/admin/resources"),
      ]);
      setRows(l.rows);
      setRequests(r.requests.filter((x) => x.resource)); // skip requests of deleted resources
      setResources(res.resources);
    } catch (err) {
      console.error("ReplacementPanel load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(request, action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(request._id);
    try {
      await fetchJson(`/api/admin/replacements/${request._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (err) {
      console.error("ReplacementPanel action error:", err);
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-loop-500">Loading…</p>;
  if (error) return <p className="py-8 text-center text-sm text-red-600">{error}</p>;

  const flagged = rows.filter((r) => r.assessment.level !== "ok");
  const open = requests.filter((r) => OPEN_REPLACEMENT_STATUSES.includes(r.status));
  const closed = requests.filter((r) => !OPEN_REPLACEMENT_STATUSES.includes(r.status));

  return (
    <div className="space-y-8">
      {/* Assessment */}
      <section>
        <h2 className="mb-1 font-display text-base font-semibold text-loop-950">
          Replacement assessment ({flagged.length})
        </h2>
        <p className="mb-3 text-xs text-loop-500">
          Signals: past useful life, 4+ breakdowns in 12 months, repair spend over 50% of purchase
          cost, poor condition. One signal = Watch, two or more = Replacement recommended.
        </p>
        <div className="space-y-3">
          {flagged.length === 0 && (
            <p className="card text-sm text-loop-700">No resources need attention.</p>
          )}
          {flagged.map((r) => (
            <div
              key={r.id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/resources/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <span className={`badge ${LEVEL[r.assessment.level].style}`}>
                    {LEVEL[r.assessment.level].label}
                  </span>
                </div>
                <p className="text-xs text-loop-500">
                  {CATEGORY_LABEL[r.category] || r.category}
                  {r.registrationNumber ? ` · ${r.registrationNumber}` : ""}
                  {r.depreciation.complete ? ` · Book value ${money(r.depreciation.bookValue)}` : ""}
                </p>
                <p className="mt-1 text-sm text-loop-700">{r.assessment.reasons.join(" · ")}</p>
                <p className="text-xs text-loop-500">
                  {r.breakdowns12m} breakdown{r.breakdowns12m === 1 ? "" : "s"} (12 months) · Repair
                  spend {money(r.maintenanceCost)}
                </p>
              </div>
              {r.openRequest ? (
                <span className="text-xs text-loop-500">
                  Request {REPLACEMENT_STATUS_LABEL[r.openRequest].toLowerCase()}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setRequesting(r)}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  Request replacement
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Open requests */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Replacement requests ({open.length})
        </h2>
        <div className="space-y-3">
          {open.length === 0 && <p className="card text-sm text-loop-700">No open requests.</p>}
          {open.map((q) => {
            const busy = busyId === q._id;
            return (
              <div key={q._id} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/resources/${q.resource._id}`}
                        className="font-medium hover:underline"
                      >
                        {q.resource.name}
                      </Link>
                      <span className={`badge ${STATUS_STYLE[q.status]}`}>
                        {REPLACEMENT_STATUS_LABEL[q.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-loop-700">{q.reason}</p>
                    <p className="text-xs text-loop-500">
                      Requested {new Date(q.createdAt).toLocaleDateString()}
                      {q.estimatedCost !== null && q.estimatedCost !== undefined
                        ? ` · Estimated cost ${money(q.estimatedCost)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(q, "approve")}
                          className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(q, "reject", `Reject the request for "${q.resource.name}"?`)}
                          className="btn-secondary px-3 py-1 text-xs disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {q.status === "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setCompleting(q)}
                        className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
                      >
                        Complete replacement
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(q, "cancel", `Cancel the request for "${q.resource.name}"?`)}
                      className="px-2 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-loop-950">
          Replacement history
        </h2>
        {closed.length === 0 ? (
          <p className="card text-sm text-loop-700">No closed requests yet.</p>
        ) : (
          <div className="card divide-y divide-loop-100 !py-2">
            {closed.slice(0, 15).map((q) => (
              <div key={q._id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-loop-900">{q.resource.name}</span>
                  <span className={`badge ${STATUS_STYLE[q.status]}`}>
                    {REPLACEMENT_STATUS_LABEL[q.status]}
                  </span>
                </div>
                <p className="text-xs text-loop-500">
                  {q.reason}
                  {q.replacementResource ? ` · Replaced by ${q.replacementResource.name}` : ""}
                  {q.replacedAt ? ` on ${formatDate(q.replacedAt)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {requesting && (
        <RequestModal
          resource={requesting}
          onClose={() => setRequesting(null)}
          onSaved={() => {
            setRequesting(null);
            load();
          }}
        />
      )}
      {completing && (
        <CompleteReplacementModal
          request={completing}
          resources={resources}
          onClose={() => setCompleting(null)}
          onSaved={() => {
            setCompleting(null);
            load();
          }}
        />
      )}
    </div>
  );
}