"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/resourceConstants";
import {
  DEPRECIATION_METHOD_OPTIONS,
  DEFAULT_USEFUL_LIFE_YEARS,
  DEFAULT_SALVAGE_RATE,
  DISPOSAL_METHOD_OPTIONS,
} from "@/lib/lifecycleConstants";
import { money, todayInput } from "@/lib/formatters";

const JSON_HEADERS = { "Content-Type": "application/json" };

function ModalShell({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-loop-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-loop-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-loop-500 hover:text-loop-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({ onClose, saving, label }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="btn-secondary">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

// Runs `action()`, calls onSaved with its result, and tracks saving/error state.
function useSubmit(action, onSaved) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await action());
    } catch (err) {
      console.error("LifecycleModals submit error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return { saving, error, submit };
}

const label = (r) =>
  `${r.name}${r.registrationNumber ? ` · ${r.registrationNumber}` : ""} (${
    STATUS_LABEL[r.status] || r.status
  })`;

// --- Depreciation settings -------------------------------------------------------------

export function SettingsModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState({
    usefulLifeYears: row.settings.usefulLifeYears ?? "",
    salvageValue: row.settings.salvageValue ?? "",
    depreciationMethod: row.settings.depreciationMethod || "",
  });
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  const defaultLife = DEFAULT_USEFUL_LIFE_YEARS[row.category] || 5;
  const defaultSalvage =
    row.purchaseCost !== null && row.purchaseCost !== undefined
      ? money(row.purchaseCost * DEFAULT_SALVAGE_RATE)
      : "10% of cost";

  const { saving, error, submit } = useSubmit(
    () =>
      fetchJson(`/api/admin/resources/${row.id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          usefulLifeYears: form.usefulLifeYears === "" ? null : Number(form.usefulLifeYears),
          salvageValue: form.salvageValue === "" ? null : Number(form.salvageValue),
          depreciationMethod: form.depreciationMethod,
        }),
      }),
    onSaved
  );

  return (
    <ModalShell title="Depreciation settings" onClose={onClose}>
      <p className="mt-2 text-sm text-loop-700">
        <span className="font-medium">{row.name}</span> · leave a field empty to use the default.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Useful life (years)</span>
            <input
              type="number"
              min="0.5"
              max="50"
              step="0.5"
              placeholder={`Default ${defaultLife}`}
              className="field-input"
              {...bind("usefulLifeYears")}
            />
          </label>
          <label className="block">
            <span className="field-label">Salvage value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={`Default ${defaultSalvage}`}
              className="field-input"
              {...bind("salvageValue")}
            />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Method</span>
          <select className="field-input" {...bind("depreciationMethod")}>
            <option value="">Default (Straight-line)</option>
            {DEPRECIATION_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions onClose={onClose} saving={saving} label="Save settings" />
      </form>
    </ModalShell>
  );
}

// --- Request a replacement --------------------------------------------------------------

export function RequestModal({ resource, onClose, onSaved }) {
  const [form, setForm] = useState({
    reason: (resource.assessment?.reasons || []).join("; "),
    estimatedCost: "",
  });
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  const { saving, error, submit } = useSubmit(
    () =>
      fetchJson("/api/admin/replacements", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          resourceId: resource.id,
          reason: form.reason,
          estimatedCost: form.estimatedCost === "" ? null : Number(form.estimatedCost),
        }),
      }),
    onSaved
  );

  return (
    <ModalShell title="Request replacement" onClose={onClose}>
      <p className="mt-2 text-sm text-loop-700">
        <span className="font-medium">{resource.name}</span>
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <span className="field-label">
            Reason<span className="text-red-500"> *</span>
          </span>
          <textarea
            required
            minLength={3}
            className="field-input min-h-[72px] resize-y"
            {...bind("reason")}
          />
        </label>
        <label className="block">
          <span className="field-label">Estimated replacement cost</span>
          <input type="number" min="0" step="0.01" className="field-input" {...bind("estimatedCost")} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions onClose={onClose} saving={saving} label="Submit request" />
      </form>
    </ModalShell>
  );
}

// --- Complete an approved replacement ----------------------------------------------------

export function CompleteReplacementModal({ request, resources, onClose, onSaved }) {
  const options = resources.filter(
    (r) => r.status !== "retired" && r._id !== request.resource._id
  );
  const [form, setForm] = useState({
    replacementResourceId: "",
    replacedAt: todayInput(),
    retireOld: true,
  });

  const { saving, error, submit } = useSubmit(
    () =>
      fetchJson(`/api/admin/replacements/${request._id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: "complete", ...form }),
      }),
    onSaved
  );

  return (
    <ModalShell title="Complete replacement" onClose={onClose}>
      <p className="mt-2 text-sm text-loop-700">
        Replacing <span className="font-medium">{request.resource.name}</span>. Register the new
        resource first (Resources → Add), then select it here.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <span className="field-label">New resource (optional)</span>
          <select
            className="field-input"
            value={form.replacementResourceId}
            onChange={(e) => setForm((prev) => ({ ...prev, replacementResourceId: e.target.value }))}
          >
            <option value="">Not registered yet</option>
            {options.map((r) => (
              <option key={r._id} value={r._id}>
                {label(r)} · {CATEGORY_LABEL[r.category] || r.category}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Replacement date</span>
          <input
            type="date"
            required
            className="field-input"
            value={form.replacedAt}
            onChange={(e) => setForm((prev) => ({ ...prev, replacedAt: e.target.value }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-loop-700">
          <input
            type="checkbox"
            checked={form.retireOld}
            onChange={(e) => setForm((prev) => ({ ...prev, retireOld: e.target.checked }))}
          />
          Retire the old resource now
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions onClose={onClose} saving={saving} label="Complete" />
      </form>
    </ModalShell>
  );
}

// --- Retire a resource ---------------------------------------------------------------------

export function RetireModal({ resources, onClose, onSaved }) {
  const options = resources.filter((r) => r.status !== "retired");
  const [form, setForm] = useState({ resourceId: "", reason: "", retiredAt: todayInput() });
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });
  const selected = options.find((r) => r._id === form.resourceId);

  const { saving, error, submit } = useSubmit(
    () =>
      fetchJson("/api/admin/retirements", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(form),
      }),
    onSaved
  );

  return (
    <ModalShell title="Retire a resource" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <span className="field-label">
            Resource<span className="text-red-500"> *</span>
          </span>
          <select required className="field-input" {...bind("resourceId")}>
            <option value="">Select a resource…</option>
            {options.map((r) => (
              <option key={r._id} value={r._id}>
                {label(r)}
              </option>
            ))}
          </select>
        </label>

        {selected?.status === "in_use" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            This resource is currently allocated. Release it on the Allocation page first.
          </p>
        )}

        <label className="block">
          <span className="field-label">
            Reason<span className="text-red-500"> *</span>
          </span>
          <textarea
            required
            minLength={3}
            className="field-input min-h-[72px] resize-y"
            placeholder="e.g. Beyond economical repair"
            {...bind("reason")}
          />
        </label>
        <label className="block">
          <span className="field-label">Retirement date</span>
          <input type="date" required className="field-input" {...bind("retiredAt")} />
        </label>
        <p className="text-xs text-loop-500">
          Open maintenance jobs for this resource are cancelled automatically.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions onClose={onClose} saving={saving} label="Retire" />
      </form>
    </ModalShell>
  );
}

// --- Record disposal ---------------------------------------------------------------------------

export function DisposeModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    disposalMethod: "sold",
    disposalDate: todayInput(),
    disposalValue: "",
    disposalReference: "",
    notes: "",
  });
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  const { saving, error, submit } = useSubmit(
    () =>
      fetchJson(`/api/admin/retirements/${record._id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: "dispose",
          ...form,
          disposalValue: form.disposalValue === "" ? null : Number(form.disposalValue),
        }),
      }),
    onSaved
  );

  return (
    <ModalShell title="Record disposal" onClose={onClose}>
      <p className="mt-2 text-sm text-loop-700">
        <span className="font-medium">{record.resource.name}</span>
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Method</span>
            <select className="field-input" {...bind("disposalMethod")}>
              {DISPOSAL_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Disposal date</span>
            <input type="date" required className="field-input" {...bind("disposalDate")} />
          </label>
          <label className="block">
            <span className="field-label">Disposal value</span>
            <input type="number" min="0" step="0.01" className="field-input" {...bind("disposalValue")} />
          </label>
          <label className="block">
            <span className="field-label">Approval / document ref.</span>
            <input type="text" className="field-input" {...bind("disposalReference")} />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Notes</span>
          <input type="text" className="field-input" {...bind("notes")} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions onClose={onClose} saving={saving} label="Record disposal" />
      </form>
    </ModalShell>
  );
}