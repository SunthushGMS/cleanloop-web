"use client";

import { useState } from "react";
import { isPastCampaignDate } from "@/lib/campaignDates";

/**
 * Inline edit form for one campaign. Sends only the fields that changed to
 * PATCH /api/campaigns/:id and shows the server's per-field messages.
 * A past campaign's date input is locked (the API refuses it anyway).
 */
export default function EditCampaignForm({ campaign, onSaved, onCancel }) {
  const original = {
    title: campaign.title,
    description: campaign.description || "",
    zone: campaign.zone || "",
    // Stored as UTC midnight, so the first 10 chars are the chosen day.
    date: campaign.date.slice(0, 10),
  };
  const dateLocked = isPastCampaignDate(campaign.date);
  const [form, setForm] = useState(original);
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

    const changes = {};
    for (const key of Object.keys(form)) {
      if (form[key] !== original[key]) changes[key] = form[key];
    }
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setFieldErrors(data.details);
          setError("Please fix the highlighted fields.");
        } else {
          setError(data.error || "Could not save changes");
        }
        return;
      }
      onSaved(data.campaign);
    } catch (err) {
      console.error("Edit campaign error:", err);
      setError("Could not save changes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const id = (name) => `${name}-${campaign._id}`;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-loop-200 pt-4">
      <div>
        <label className="field-label" htmlFor={id("title")}>Title</label>
        <input
          id={id("title")}
          required
          minLength={3}
          maxLength={120}
          className="field-input"
          value={form.title}
          onChange={update("title")}
        />
        <FieldError messages={fieldErrors.title} />
      </div>
      <div>
        <label className="field-label" htmlFor={id("description")}>Description</label>
        <textarea
          id={id("description")}
          rows={3}
          maxLength={1000}
          className="field-input"
          value={form.description}
          onChange={update("description")}
        />
        <FieldError messages={fieldErrors.description} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor={id("zone")}>Zone / ward</label>
          <input
            id={id("zone")}
            maxLength={80}
            className="field-input"
            value={form.zone}
            onChange={update("zone")}
          />
          <FieldError messages={fieldErrors.zone} />
        </div>
        <div>
          <label className="field-label" htmlFor={id("date")}>Date</label>
          <input
            id={id("date")}
            type="date"
            required
            disabled={dateLocked}
            className="field-input"
            value={form.date}
            onChange={update("date")}
          />
          {dateLocked && (
            <p className="mt-1 text-xs text-loop-500">
              This campaign has already taken place, so its date can&apos;t change.
            </p>
          )}
          <FieldError messages={fieldErrors.date} />
        </div>
      </div>
      {error && <p className="text-sm text-clay-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Saving..." : "Save changes"}
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
