"use client";

import { useState } from "react";

const META_FIELDS = {
  bin: [{ key: "capacity", label: "Capacity", placeholder: "e.g. 120L" }],
  truck: [
    { key: "plate", label: "Plate number", placeholder: "e.g. WP-CAB-4021" },
    { key: "fuelType", label: "Fuel type", placeholder: "e.g. diesel" },
  ],
  ppe: [
    { key: "size", label: "Size", placeholder: "e.g. L" },
    { key: "expiresAt", label: "Expires", placeholder: "YYYY-MM-DD" },
  ],
  other: [],
};

function emptyForm() {
  return {
    name: "",
    category: "bin",
    identifier: "",
    status: "active",
    condition: "good",
    quantity: 1,
    zone: "",
    lastServicedAt: "",
    notes: "",
    meta: {},
  };
}

export default function ResourceFormModal({ target, zones = [], onClose, onSaved }) {
  const isEdit = Boolean(target);

  const [form, setForm] = useState(() => {
    if (!target) return emptyForm();
    return {
      name: target.name || "",
      category: target.category || "bin",
      identifier: target.identifier || "",
      status: target.status || "active",
      condition: target.condition || "good",
      quantity: target.quantity ?? 1,
      zone: target.zone || "",
      lastServicedAt: target.lastServicedAt ? target.lastServicedAt.slice(0, 10) : "",
      notes: target.notes || "",
      meta: target.meta || {},
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateMeta(key, value) {
    setForm((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isEdit
      ? `/api/admin/resources/${target._id}`
      : "/api/admin/resources";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity) || 0,
          lastServicedAt: form.lastServicedAt || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Save failed");
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
        className="w-full max-w-lg rounded-[3px] bg-loop-50 p-6 shadow-card"
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="field-input"
              />
            </Field>

            <Field label="Category" required>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="field-input"
              >
                <option value="bin">Bin</option>
                <option value="truck">Truck</option>
                <option value="ppe">PPE</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="ID / Tag">
              <input
                type="text"
                value={form.identifier}
                onChange={(e) => update("identifier", e.target.value)}
                className="field-input"
                placeholder="Asset tag / serial"
              />
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                className="field-input"
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="field-input"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </Field>

            <Field label="Condition">
              <select
                value={form.condition}
                onChange={(e) => update("condition", e.target.value)}
                className="field-input"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
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

            <Field label="Last serviced">
              <input
                type="date"
                value={form.lastServicedAt}
                onChange={(e) => update("lastServicedAt", e.target.value)}
                className="field-input"
              />
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

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="field-input min-h-[72px] resize-y"
            />
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