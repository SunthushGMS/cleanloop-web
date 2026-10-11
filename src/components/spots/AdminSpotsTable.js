"use client";

import { Fragment, useState } from "react";
import ConditionBadge from "@/components/spots/ConditionBadge";
import SpotHistory from "@/components/spots/SpotHistory";
import { STALE_AFTER_DAYS } from "@/lib/spotConstants";

const FILTERS = {
  all: { label: "All", test: () => true },
  attention: { label: "Needs attention", test: (s) => s.health.needsAttention },
  stale: { label: `Stale (${STALE_AFTER_DAYS}+ days)`, test: (s) => s.health.stale },
  unadopted: { label: "No volunteer", test: (s) => !s.health.adopted },
};

const EMPTY_SPOT = { name: "", street: "", zone: "", description: "" };

async function sendJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

function lastCheckedText(spot) {
  const days = spot.health.daysSinceCheck;
  if (!spot.lastCheckIn) return spot.health.adopted ? "Never" : "—";
  if (days === 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Admin overview of every spot: who adopted it, when it was last checked,
 * and highlights for stale spots (adopted but not checked for 14 days) and
 * spots whose latest check-in needs attention. Admins can add spots, edit
 * details, view history and release a quiet volunteer's spot.
 */
export default function AdminSpotsTable({ spots, onSpotsChanged }) {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const counts = {
    total: spots.length,
    unadopted: spots.filter(FILTERS.unadopted.test).length,
    stale: spots.filter(FILTERS.stale.test).length,
    attention: spots.filter(FILTERS.attention.test).length,
  };
  const visible = spots.filter(FILTERS[filter].test);

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Spots" value={counts.total} />
        <Stat label="No volunteer" value={counts.unadopted} />
        <Stat label="Stale" value={counts.stale} warn={counts.stale > 0} />
        <Stat label="Needs attention" value={counts.attention} warn={counts.attention > 0} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(FILTERS).map(([key, f]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`${filter === key ? "btn-primary" : "btn-secondary"} px-3 py-1 text-xs`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="btn-secondary px-3 py-1 text-xs">
          {showAdd ? "Close" : "Add spot"}
        </button>
      </div>

      {showAdd && (
        <AddSpotForm
          onCreated={() => {
            setShowAdd(false);
            onSpotsChanged();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-[3px] border border-loop-200 bg-loop-50">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-loop-200 text-xs uppercase tracking-wide text-loop-500">
            <tr>
              <th className="px-4 py-3 font-medium">Spot</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Volunteer</th>
              <th className="px-4 py-3 font-medium">Last checked</th>
              <th className="px-4 py-3 font-medium">Condition</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const highlight = s.health.needsAttention
                ? "bg-clay-500/10"
                : s.health.stale
                ? "bg-amber-500/10"
                : "";
              const open = openId === s._id;
              return (
                <Fragment key={s._id}>
                  <tr className={`border-b border-loop-100 align-top ${highlight}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-loop-900">{s.name}</p>
                      {s.street && <p className="text-xs text-loop-500">{s.street}</p>}
                    </td>
                    <td className="px-4 py-3 text-loop-700">{s.zone}</td>
                    <td className="px-4 py-3 text-loop-700">
                      {s.adopter?.name || <span className="text-loop-400">No volunteer</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={s.health.stale ? "font-medium text-amber-600" : "text-loop-700"}>
                        {lastCheckedText(s)}
                      </span>
                      {s.health.stale && <p className="text-xs text-amber-600">Stale</p>}
                    </td>
                    <td className="px-4 py-3">
                      <ConditionBadge condition={s.lastCheckIn?.condition} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : s._id)}
                        aria-expanded={open}
                        className="text-xs text-loop-700 underline"
                      >
                        {open ? "Close" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-loop-100">
                      <td colSpan={6} className="bg-white px-4 py-4">
                        <SpotDetails spot={s} onChanged={onSpotsChanged} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-loop-500">
                  {spots.length === 0 ? "No spots yet. Approve a request or add one." : "No spots match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div>
      <p className="manifest-label text-loop-500">{label}</p>
      <p className={`font-display text-2xl font-bold ${warn ? "text-clay-600" : "text-loop-950"}`}>
        {value}
      </p>
    </div>
  );
}

function SpotDetails({ spot, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleRelease() {
    if (
      !window.confirm(
        `Release "${spot.name}" from ${spot.adopter?.name || "its volunteer"}? It goes back to the list of spots needing a volunteer.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { ok, data } = await sendJson(`/api/spots/${spot._id}/release`, "POST");
      if (!ok) {
        setError(data.error || "Could not release spot");
        return;
      }
      onChanged();
    } catch (err) {
      console.error("Release spot error:", err);
      setError("Could not release spot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {spot.description && <p className="text-sm text-loop-700">{spot.description}</p>}
      {spot.lastCheckIn?.note && (
        <p className="text-sm text-loop-700">
          <span className="font-medium">Latest note:</span> {spot.lastCheckIn.note}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing((v) => !v)} className="btn-secondary px-3 py-1 text-xs">
          {editing ? "Close edit" : "Edit details"}
        </button>
        {spot.adopter && (
          <button type="button" onClick={handleRelease} disabled={busy} className="btn-secondary px-3 py-1 text-xs text-clay-600">
            Release from volunteer
          </button>
        )}
      </div>
      {error && <p className="text-sm text-clay-600">{error}</p>}
      {editing && (
        <SpotForm
          initial={{
            name: spot.name,
            street: spot.street || "",
            zone: spot.zone,
            description: spot.description || "",
          }}
          submitLabel="Save changes"
          onSubmit={(form) => sendJson(`/api/spots/${spot._id}`, "PATCH", form)}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
      <div>
        <p className="manifest-label mb-2 text-loop-500">History</p>
        <SpotHistory spotId={spot._id} />
      </div>
    </div>
  );
}

function AddSpotForm({ onCreated }) {
  return (
    <div className="card">
      <p className="mb-3 text-sm font-medium text-loop-900">Add a known problem spot</p>
      <SpotForm
        initial={EMPTY_SPOT}
        submitLabel="Add spot"
        onSubmit={(form) => sendJson("/api/spots", "POST", form)}
        onDone={onCreated}
      />
    </div>
  );
}

/** Shared create/edit form. `onSubmit(form)` returns { ok, data }. */
function SpotForm({ initial, submitLabel, onSubmit, onDone }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const { ok, data } = await onSubmit(form);
      if (!ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setFieldErrors(data.details);
          setError("Please fix the highlighted fields.");
        } else {
          setError(data.error || "Could not save spot");
        }
        return;
      }
      onDone();
    } catch (err) {
      console.error("Save spot error:", err);
      setError("Could not save spot. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { key: "name", label: "Spot name", required: true, max: 120 },
    { key: "zone", label: "Zone / ward", required: true, max: 80 },
    { key: "street", label: "Street", max: 160 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="field-label" htmlFor={`spot-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`spot-${f.key}`}
              required={f.required}
              maxLength={f.max}
              className="field-input"
              value={form[f.key]}
              onChange={update(f.key)}
            />
            {fieldErrors[f.key] && <p className="mt-1 text-xs text-clay-600">{fieldErrors[f.key].join(" ")}</p>}
          </div>
        ))}
      </div>
      <div>
        <label className="field-label" htmlFor="spot-description">
          Description
        </label>
        <textarea
          id="spot-description"
          rows={2}
          maxLength={1000}
          className="field-input"
          value={form.description}
          onChange={update("description")}
        />
      </div>
      {error && <p className="text-sm text-clay-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
        {busy ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
