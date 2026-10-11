"use client";

import { useState } from "react";

/**
 * Inline form for the organizer to record (or update) what a campaign
 * achieved. PUTs to /api/campaigns/:id/outcome; blanks mean "not recorded".
 */
export default function OutcomeForm({ campaign, onSaved, onCancel }) {
  const existing = campaign.outcome || {};
  const [form, setForm] = useState({
    bagsCollected: existing.bagsCollected ?? "",
    kgCollected: existing.kgCollected ?? "",
    notes: existing.notes || "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => {
      const { value } = e.target;
      setForm((f) => ({ ...f, [field]: value }));
      setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign._id}/outcome`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setFieldErrors(data.details);
          setError("Please fix the highlighted fields.");
        } else {
          setError(data.error || "Could not save outcome");
        }
        return;
      }
      onSaved(data.campaign);
    } catch (err) {
      console.error("Save outcome error:", err);
      setError("Could not save outcome. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const id = (name) => `${name}-${campaign._id}`;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-loop-200 pt-4">
      <p className="text-sm font-medium text-loop-900">What did the campaign achieve?</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor={id("bags")}>Bags collected</label>
          <input
            id={id("bags")}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            className="field-input"
            value={form.bagsCollected}
            onChange={update("bagsCollected")}
          />
          <FieldError messages={fieldErrors.bagsCollected} />
        </div>
        <div>
          <label className="field-label" htmlFor={id("kg")}>Approx. kg collected</label>
          <input
            id={id("kg")}
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            className="field-input"
            value={form.kgCollected}
            onChange={update("kgCollected")}
          />
          <FieldError messages={fieldErrors.kgCollected} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor={id("notes")}>Notes</label>
        <textarea
          id={id("notes")}
          rows={2}
          maxLength={500}
          placeholder="e.g. 18 people came, cleared the canal bank"
          className="field-input"
          value={form.notes}
          onChange={update("notes")}
        />
        <FieldError messages={fieldErrors.notes} />
      </div>
      {error && <p className="text-sm text-clay-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Saving..." : "Save outcome"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldError({ messages }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-clay-600">{messages.join(" ")}</p>;
}
