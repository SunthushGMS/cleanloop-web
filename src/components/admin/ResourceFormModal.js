"use client";

import { useState } from "react";
import {
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  CONDITION_OPTIONS,
} from "@/lib/resourceConstants";

const META_FIELDS = {
  truck: FUEL,
  tractor: FUEL,
  lorry: FUEL,
  compactor: FUEL,
  bin: [],
  weighing: [],
  ppe: [
    { key: "size", label: "Size", placeholder: "e.g. L" },
    { key: "expiresAt", label: "Expires", placeholder: "YYYY-MM-DD" },
  ],
  other: [],
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

function emptyForm() {
  return {
    name: "",
    category: "truck",
    identifier: "",
    registrationNumber: "",
    make: "",
    model: "",
    purchaseDate: "",
    purchaseCost: "",
    capacity: "",
    status: "active",
    condition: "good",
    quantity: 1,
    zone: "",
    operatorName: "",
    warranty: "",
    lastServicedAt: "",
    nextMaintenanceAt: "",
    notes: "",
    meta: {},
  };
}

export default function ResourceFormModal({ target, zones = [], onClose, onSaved }) {
  const isEdit = Boolean(target);

  const [form, setForm] = useState(() => (target ? formFromTarget(target) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateMeta(key, value) {
    setForm((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  }

  // Shortcut for plain text/select inputs.
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => update(field, e.target.value),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isEdit
      ? `/api/admin/resources/${target._id}`
      : "/api/admin/resources";
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      ...form,
      quantity: Number(form.quantity) || 0,
      purchaseCost: form.purchaseCost === "" ? null : Number(form.purchaseCost),
      purchaseDate: form.purchaseDate || null,
      lastServicedAt: form.lastServicedAt || null,
      nextMaintenanceAt: form.nextMaintenanceAt || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(buildError(data, "Save failed"));
      }
      onSaved(data.resource);
    } catch (err) {
      console.error("ResourceFormModal submit error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const metaFields = META_FIELDS[form.category] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-loop-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-loop-950">
            {isEdit ? "Edit resource" : "Add resource"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-loop-500 hover:text-loop-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <input type="text" required className="field-input" {...bind("name")} />
            </Field>

            <Field label="Category" required>
              <select className="field-input" {...bind("category")}>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Registration number">
              <input
                type="text"
                className="field-input"
                placeholder="e.g. WP CA 1234"
                {...bind("registrationNumber")}
              />
            </Field>

            <Field label="ID / Tag">
              <input
                type="text"
                className="field-input"
                placeholder="Asset tag / serial"
                {...bind("identifier")}
              />
            </Field>

            <Field label="Make">
              <input type="text" className="field-input" placeholder="e.g. Isuzu" {...bind("make")} />
            </Field>

            <Field label="Model">
              <input type="text" className="field-input" placeholder="e.g. NPR" {...bind("model")} />
            </Field>

            <Field label="Purchase date">
              <input type="date" className="field-input" {...bind("purchaseDate")} />
            </Field>

            <Field label="Purchase cost">
              <input
                type="number"
                min="0"
                step="0.01"
                className="field-input"
                {...bind("purchaseCost")}
              />
            </Field>

            <Field label="Capacity">
              <input
                type="text"
                className="field-input"
                placeholder="e.g. 8 tonnes / 120L"
                {...bind("capacity")}
              />
            </Field>

            <Field label="Quantity">
              <input type="number" min="0" className="field-input" {...bind("quantity")} />
            </Field>

            <Field label="Status">
              <select className="field-input" {...bind("status")}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Condition">
              <select className="field-input" {...bind("condition")}>
                {CONDITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Was a free-text input — now sourced from the admin-managed
                Zone list (passed down from ResourceManager). "No zone
                assigned" keeps this optional, matching Resource.zone's
                schema default of "". */}
            <Field label="Zone">
              <select
                value={form.zone}
                onChange={(e) => update("zone", e.target.value)}
                className="field-input"
              >
                <option value="">No zone assigned</option>
                {zones.map((z) => (
                  <option key={z._id} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assigned driver / operator">
              <input type="text" className="field-input" {...bind("operatorName")} />
            </Field>

            <Field label="Last serviced">
              <input type="date" className="field-input" {...bind("lastServicedAt")} />
            </Field>

            <Field label="Next maintenance">
              <input type="date" className="field-input" {...bind("nextMaintenanceAt")} />
            </Field>

            {metaFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  type="text"
                  value={form.meta[f.key] || ""}
                  onChange={(e) => updateMeta(f.key, e.target.value)}
                  className="field-input"
                  placeholder={f.placeholder}
                />
              </Field>
            ))}
          </div>

          <Field label="Warranty information">
            <input
              type="text"
              className="field-input"
              placeholder="e.g. 3 years, expires 2027-05-01"
              {...bind("warranty")}
            />
          </Field>

          <Field label="Notes">
            <textarea className="field-input min-h-[72px] resize-y" {...bind("notes")} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add resource"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid #e3e0d2;
          border-radius: 3px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: #fff;
          color: #10160f;
        }
        :global(.input:focus) {
          outline: 2px solid #e2a33b;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}