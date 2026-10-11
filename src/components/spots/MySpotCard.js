"use client";

import { useState } from "react";
import ConditionBadge from "@/components/spots/ConditionBadge";
import SpotHistory from "@/components/spots/SpotHistory";
import { CHECKIN_CONDITIONS, CONDITION_LABELS, STALE_AFTER_DAYS } from "@/lib/spotConstants";

function lastCheckedText(spot) {
  if (!spot.lastCheckIn) return "Not checked yet";
  const days = spot.health.daysSinceCheck;
  return days === 0 ? "Checked today" : `Last checked ${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * A spot the volunteer has adopted: quick check-in (condition + note),
 * history, and release ("I can't do this anymore").
 */
export default function MySpotCard({ spot, onChange, onReleased }) {
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const { stale, needsAttention } = spot.health;

  async function handleCheckIn(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/spots/${spot._id}/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details?.condition?.[0] || data.details?.note?.[0] || data.error || "Could not save check-in");
        return;
      }
      setCondition("");
      setNote("");
      setMessage(
        condition === "clean"
          ? "Thanks, check-in saved."
          : "Thanks, check-in saved. Operations can see this spot needs attention."
      );
      setHistoryKey((k) => k + 1);
      onChange();
    } catch (err) {
      console.error("Check-in error:", err);
      setError("Could not save check-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (!window.confirm(`Stop looking after "${spot.name}"? It will go back to the list of spots needing a volunteer.`)) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/spots/${spot._id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not release spot");
        return;
      }
      onReleased(spot._id);
    } catch (err) {
      console.error("Release spot error:", err);
      setError("Could not release spot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card ${stale ? "border-amber-500/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-loop-900">{spot.name}</p>
          <p className="text-xs text-loop-500">{[spot.street, spot.zone].filter(Boolean).join(" · ")}</p>
          {spot.description && <p className="mt-1 text-sm text-loop-700">{spot.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <ConditionBadge condition={spot.lastCheckIn?.condition} />
          <span className={`text-xs ${stale ? "font-medium text-amber-600" : "text-loop-500"}`}>
            {lastCheckedText(spot)}
          </span>
        </div>
      </div>

      {stale && (
        <p className="mt-2 text-xs text-amber-600">
          Not checked for {STALE_AFTER_DAYS}+ days. Operations sees this spot as stale until you check in.
        </p>
      )}
      {needsAttention && spot.lastCheckIn?.note && (
        <p className="mt-2 text-xs text-loop-700">Last note: {spot.lastCheckIn.note}</p>
      )}

      <form onSubmit={handleCheckIn} className="mt-4 space-y-3 border-t border-loop-200 pt-4">
        <fieldset>
          <legend className="field-label">How does it look today?</legend>
          <div className="flex flex-wrap gap-2">
            {CHECKIN_CONDITIONS.map((c) => (
              <label
                key={c}
                className={`cursor-pointer rounded-[3px] border px-3 py-1.5 text-sm ${
                  condition === c ? "border-loop-700 bg-loop-700 text-loop-50" : "border-loop-300 bg-white text-loop-900"
                }`}
              >
                <input
                  type="radio"
                  name={`condition-${spot._id}`}
                  value={c}
                  checked={condition === c}
                  onChange={() => setCondition(c)}
                  className="sr-only"
                  required
                />
                {CONDITION_LABELS[c]}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="field-label" htmlFor={`note-${spot._id}`}>Note (optional)</label>
          <input
            id={`note-${spot._id}`}
            maxLength={500}
            placeholder={condition === "clean" ? "e.g. All clear" : "e.g. Two sacks of household waste near the lamp post"}
            className="field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-clay-600">{error}</p>}
        {message && <p className="text-sm text-loop-700">{message}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || !condition} className="btn-primary disabled:opacity-60">
            {busy ? "Saving..." : "Save check-in"}
          </button>
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="btn-secondary">
            {showHistory ? "Hide history" : "History"}
          </button>
          <button type="button" onClick={handleRelease} disabled={busy} className="ml-auto text-xs text-clay-600 underline">
            I can&apos;t look after this anymore
          </button>
        </div>
      </form>

      {showHistory && (
        <div className="mt-4 border-t border-loop-200 pt-4">
          <SpotHistory spotId={spot._id} refreshKey={historyKey} />
        </div>
      )}
    </div>
  );
}
