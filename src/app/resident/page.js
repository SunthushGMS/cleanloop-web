"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

const TYPE_LABELS = {
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  hazard: "Hazard",
  other: "Other",
};

export default function ResidentPage() {
  const [schedules, setSchedules] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({
    type: "missed_collection",
    description: "",
    zone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const [scheduleRes, complaintRes] = await Promise.all([
        fetch("/api/schedules"),
        fetch("/api/complaints"),
      ]);
      const scheduleData = await scheduleRes.json();
      const complaintData = await complaintRes.json();
      setSchedules(scheduleData.schedules || []);
      setComplaints(complaintData.complaints || []);
    } catch (e) {
      console.error("Failed to load resident data:", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        description: form.description,
        zone: form.zone.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not submit report");
      return;
    }
    setForm({ type: "missed_collection", description: "", zone: "" });
    loadData();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Your collection schedule
        </h2>
        {schedules.length === 0 ? (
          <p className="card text-sm text-loop-700">
            No schedule has been published for your zone yet. Check back soon.
          </p>
        ) : (
          <div className="card divide-y divide-loop-100">
            {schedules.map((s) => (
              <div key={s._id} className="flex justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-loop-900">{s.dayOfWeek}</span>
                <span className="text-sm capitalize text-loop-700">{s.wasteType}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Report an issue
        </h2>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="field-label" htmlFor="type">
              What happened?
            </label>
            <select
              id="type"
              className="field-input"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="zone">
              Zone / Ward location (optional)
            </label>
            <input
              id="zone"
              type="text"
              placeholder="e.g. Zone 4 — Maple Street"
              className="field-input"
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="description">
              Details
            </label>
            <textarea
              id="description"
              required
              minLength={5}
              rows={3}
              className="field-input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-loop-950">
            Your reports
          </h2>
          <Link href="/resident/complaints" className="text-sm text-loop-700 underline">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {complaints.slice(0, 3).map((c) => (
            <div key={c._id} className="card flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-loop-900">
                    {TYPE_LABELS[c.type]}
                  </p>
                  {c.zone && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-900">
                      Zone: {c.zone}
                    </span>
                  )}
                </div>
                <p className="text-sm text-loop-700 mt-1">{c.description}</p>
                {c.resolutionNotes && (
                  <p className="text-xs text-loop-600 mt-1 bg-loop-100/60 p-1.5 rounded border-l-2 border-loop-700">
                    <strong>Note:</strong> {c.resolutionNotes}
                  </p>
                )}
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
          {complaints.length === 0 && (
            <p className="card text-sm text-loop-700">No reports submitted yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
