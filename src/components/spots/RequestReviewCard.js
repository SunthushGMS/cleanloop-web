"use client";

import { useState } from "react";

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-loop-700/15 text-loop-700",
  merged: "bg-loop-100 text-loop-700",
  rejected: "bg-clay-500/15 text-clay-600",
  withdrawn: "bg-loop-100 text-loop-500",
};

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

/**
 * One spot request in the admin queue. Pending requests can be approved
 * (with edits), merged into an existing spot, or rejected with a reason.
 * `allSpots` feeds the merge picker (same-zone suggestions listed first).
 */
export default function RequestReviewCard({ request: r, allSpots, onReviewed }) {
  const [mode, setMode] = useState(null); // null | "approve" | "merge" | "reject"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [approveForm, setApproveForm] = useState({
    name: r.landmark,
    street: r.street || "",
    zone: r.zone,
    description: r.description || "",
  });
  const suggestions = r.suggestions || [];
  const [mergeSpotId, setMergeSpotId] = useState(suggestions[0]?._id || "");
  const [reason, setReason] = useState("");

  const pending = r.status === "pending";
  const otherSpots = allSpots.filter((s) => !suggestions.some((sug) => sug._id === s._id));

  function openMode(next) {
    setMode(next);
    setError("");
    setFieldErrors({});
  }

  async function submit(path, body) {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const { ok, data } = await postJson(`/api/admin/spot-requests/${r._id}/${path}`, body);
      if (!ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setFieldErrors(data.details);
          setError("Please fix the highlighted fields.");
        } else {
          setError(data.error || "Something went wrong");
        }
        return;
      }
      setMode(null);
      onReviewed(r._id, data);
    } catch (err) {
      console.error(`Review (${path}) error:`, err);
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const updateApprove = (field) => (e) => {
    const { value } = e.target;
    setApproveForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
  };
  const id = (name) => `${name}-${r._id}`;

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-loop-900">{r.landmark}</p>
            <span className={`badge ${STATUS_STYLES[r.status] || ""}`}>{r.status}</span>
            {r.wantsToAdopt && pending && (
              <span className="badge bg-loop-100 text-loop-700">Wants to adopt</span>
            )}
          </div>
          <p className="mt-1 text-xs text-loop-500">
            {[r.street, r.zone].filter(Boolean).join(" · ")}
          </p>
          {r.description && <p className="mt-1 text-sm text-loop-700">{r.description}</p>}
          <p className="mt-1 text-xs text-loop-500">
            From {r.reporter?.name || "a volunteer"}
            {r.reporter?.email ? ` (${r.reporter.email})` : ""} · {formatDate(r.createdAt)}
          </p>
          {r.status === "rejected" && r.rejectReason && (
            <p className="mt-1 text-xs text-clay-600">Rejected: {r.rejectReason}</p>
          )}
          {(r.status === "approved" || r.status === "merged") && r.spot && (
            <p className="mt-1 text-xs text-loop-700">
              {r.status === "approved" ? "Became" : "Merged into"} spot: {r.spot.name}
            </p>
          )}
        </div>
        {r.hasPhoto && (
          <a
            href={`/api/spot-requests/${r._id}/photo`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open full photo"
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/spot-requests/${r._id}/photo`}
              alt={`Photo of ${r.landmark}`}
              className="h-24 w-32 rounded-[3px] border border-loop-200 object-cover"
            />
          </a>
        )}
      </div>

      {pending && suggestions.length > 0 && mode === null && (
        <p className="mt-3 text-xs text-amber-600">
          Possible duplicate: {suggestions.length} existing spot
          {suggestions.length === 1 ? "" : "s"} in this zone (
          {suggestions.map((s) => s.name).join(", ")}).
        </p>
      )}

      {pending && mode === null && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-loop-200 pt-4">
          <button type="button" onClick={() => openMode("approve")} className="btn-primary px-3 py-1 text-xs">
            Approve
          </button>
          <button
            type="button"
            onClick={() => openMode("merge")}
            disabled={allSpots.length === 0}
            title={allSpots.length === 0 ? "There are no spots to merge into yet" : undefined}
            className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
          >
            Merge into existing spot
          </button>
          <button
            type="button"
            onClick={() => openMode("reject")}
            className="btn-secondary px-3 py-1 text-xs text-clay-600"
          >
            Reject
          </button>
        </div>
      )}

      {mode === "approve" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit("approve", approveForm);
          }}
          className="mt-4 space-y-4 border-t border-loop-200 pt-4"
        >
          <p className="text-xs text-loop-500">
            Check the details before creating the spot. Keep zone spelling consistent
            {r.wantsToAdopt ? `. ${r.reporter?.name || "The volunteer"} will become its adopter.` : "."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id("name")} label="Spot name" errors={fieldErrors.name}>
              <input id={id("name")} required minLength={3} maxLength={120} className="field-input" value={approveForm.name} onChange={updateApprove("name")} />
            </Field>
            <Field id={id("zone")} label="Zone / ward" errors={fieldErrors.zone}>
              <input id={id("zone")} required maxLength={80} className="field-input" value={approveForm.zone} onChange={updateApprove("zone")} />
            </Field>
          </div>
          <Field id={id("street")} label="Street" errors={fieldErrors.street}>
            <input id={id("street")} maxLength={160} className="field-input" value={approveForm.street} onChange={updateApprove("street")} />
          </Field>
          <Field id={id("description")} label="Description" errors={fieldErrors.description}>
            <textarea id={id("description")} rows={2} maxLength={1000} className="field-input" value={approveForm.description} onChange={updateApprove("description")} />
          </Field>
          <FormButtons busy={busy} label="Create spot" onCancel={() => setMode(null)} />
        </form>
      )}

      {mode === "merge" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit("merge", { spotId: mergeSpotId });
          }}
          className="mt-4 space-y-4 border-t border-loop-200 pt-4"
        >
          <Field id={id("merge")} label="Merge into" errors={fieldErrors.spotId}>
            <select
              id={id("merge")}
              required
              className="field-input"
              value={mergeSpotId}
              onChange={(e) => setMergeSpotId(e.target.value)}
            >
              <option value="" disabled>
                Choose a spot
              </option>
              {suggestions.length > 0 && (
                <optgroup label="Same zone">
                  {suggestions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {s.adopter ? ` (adopted by ${s.adopter.name})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Other spots">
                {otherSpots.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — {s.zone}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          {r.wantsToAdopt && (
            <p className="text-xs text-loop-500">
              The volunteer becomes the adopter only if that spot has no adopter yet.
            </p>
          )}
          <FormButtons busy={busy} label="Merge" onCancel={() => setMode(null)} />
        </form>
      )}

      {mode === "reject" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit("reject", { reason });
          }}
          className="mt-4 space-y-4 border-t border-loop-200 pt-4"
        >
          <Field id={id("reason")} label="Reason (the volunteer will see this)" errors={fieldErrors.reason}>
            <input
              id={id("reason")}
              required
              minLength={3}
              maxLength={300}
              placeholder="e.g. One-off pile, not a recurring spot"
              className="field-input"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFieldErrors({});
              }}
            />
          </Field>
          <FormButtons busy={busy} label="Reject request" onCancel={() => setMode(null)} />
        </form>
      )}

      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}
    </div>
  );
}

function Field({ id, label, errors, children }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {errors?.length > 0 && <p className="mt-1 text-xs text-clay-600">{errors.join(" ")}</p>}
    </div>
  );
}

function FormButtons({ busy, label, onCancel }) {
  return (
    <div className="flex gap-3">
      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
        {busy ? "Saving..." : label}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
    </div>
  );
}
