"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { STATUS_LABEL, CATEGORY_LABEL } from "@/lib/resourceConstants";

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

const resourceLabel = (r) =>
  `${r.name}${r.registrationNumber ? ` · ${r.registrationNumber}` : ""} (${
    STATUS_LABEL[r.status] || r.status
  })`;

// --- Report breakdown / Schedule maintenance --------------------------------------

export function ReportModal({ mode, resources, presetResourceId, onClose, onSaved }) {
  const isBreakdown = mode === "breakdown";
  const candidates = resources.filter((r) => r.status !== "retired");

  const [form, setForm] = useState({
    resourceId: presetResourceId || "",
    description: "",
    scheduledFor: "",
    estimatedCompletion: "",
    repairedBy: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  const selected = candidates.find((r) => r._id === form.resourceId);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await fetchJson("/api/admin/maintenance", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ type: mode, ...form }),
      });
      onSaved(data);
    } catch (err) {
      console.error("ReportModal submit error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={isBreakdown ? "Report breakdown" : "Schedule maintenance"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="field-label">
            Resource<span className="text-red-500"> *</span>
          </span>
          <select required className="field-input" {...bind("resourceId")}>
            <option value="">Select a resource…</option>
            {candidates.map((r) => (
              <option key={r._id} value={r._id}>
                {resourceLabel(r)}
              </option>
            ))}
          </select>
        </label>

        {isBreakdown && selected?.status === "in_use" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            This resource is currently allocated. Reporting the breakdown will release that
            allocation, and you can then assign a replacement.
          </p>
        )}

        <label className="block">
          <span className="field-label">
            {isBreakdown ? "Problem" : "Work to be done"}
            <span className="text-red-500"> *</span>
          </span>
          <textarea
            required
            minLength={3}
            className="field-input min-h-[72px] resize-y"
            placeholder={isBreakdown ? "e.g. Engine overheating" : "e.g. Oil change and tyre inspection"}
            {...bind("description")}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isBreakdown ? (
            <label className="block">
              <span className="field-label">Estimated completion</span>
              <input type="date" className="field-input" {...bind("estimatedCompletion")} />
            </label>
          ) : (
            <label className="block">
              <span className="field-label">
                Scheduled date<span className="text-red-500"> *</span>
              </span>
              <input type="date" required className="field-input" {...bind("scheduledFor")} />
            </label>
          )}

          <label className="block">
            <span className="field-label">Mechanic / workshop</span>
            <input type="text" className="field-input" {...bind("repairedBy")} />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions
          onClose={onClose}
          saving={saving}
          label={isBreakdown ? "Report breakdown" : "Schedule"}
        />
      </form>
    </ModalShell>
  );
}

// --- Complete a record ----------------------------------------------------------------

export function CompleteModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState({ cost: "", resolution: "", nextServiceDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await fetchJson(`/api/admin/maintenance/${record._id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: "complete",
          cost: form.cost === "" ? null : Number(form.cost),
          resolution: form.resolution,
          nextServiceDate: form.nextServiceDate || null,
        }),
      });
      onSaved(data);
    } catch (err) {
      console.error("CompleteModal submit error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Complete work" onClose={onClose}>
      <p className="mt-2 text-sm text-loop-700">
        <span className="font-medium">{record.resource.name}</span> — {record.description}
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Cost</span>
            <input type="number" min="0" step="0.01" className="field-input" {...bind("cost")} />
          </label>
          <label className="block">
            <span className="field-label">Next service due</span>
            <input type="date" className="field-input" {...bind("nextServiceDate")} />
          </label>
        </div>
        <label className="block">
          <span className="field-label">What was done</span>
          <textarea className="field-input min-h-[72px] resize-y" {...bind("resolution")} />
        </label>
        <p className="text-xs text-loop-500">
          The resource returns to Available unless another open record still keeps it out of
          service.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Actions onClose={onClose} saving={saving} label="Mark complete" />
      </form>
    </ModalShell>
  );
}

// --- Assign a replacement ---------------------------------------------------------------

export function ReplaceModal({ record, resources, onClose, onSaved }) {
  // Available resources only, same category first.
  const options = resources
    .filter((r) => r.status === "active" && r._id !== record.resource._id)
    .sort(
      (a, b) =>
        Number(b.category === record.resource.category) -
        Number(a.category === record.resource.category)
    );

  const [replacementId, setReplacementId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await fetchJson(`/api/admin/maintenance/${record._id}/replace`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ replacementId }),
      });
      onSaved(data);
    } catch (err) {
      console.error("ReplaceModal submit error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Assign replacement" onClose={onClose}>
      <p className="mt-2 text-sm text-loop-700">
        Replacing <span className="font-medium">{record.resource.name}</span>. The replacement
        takes over the same route, driver, date and shift.
      </p>

      {options.length === 0 ? (
        <p className="mt-5 text-sm text-loop-700">No other resources are available right now.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="field-label">
              Replacement resource<span className="text-red-500"> *</span>
            </span>
            <select
              required
              className="field-input"
              value={replacementId}
              onChange={(e) => setReplacementId(e.target.value)}
            >
              <option value="">Select an available resource…</option>
              {options.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                  {r.registrationNumber ? ` · ${r.registrationNumber}` : ""} ·{" "}
                  {CATEGORY_LABEL[r.category] || r.category}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Actions onClose={onClose} saving={saving} label="Assign replacement" />
        </form>
      )}
    </ModalShell>
  );
}