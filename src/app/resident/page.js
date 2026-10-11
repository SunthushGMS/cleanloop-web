"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import CollectionSchedule from "@/components/resident/CollectionSchedule";
import ZoneProgress from "@/components/resident/ZoneProgress";

const TYPE_LABELS = {
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  hazard: "Hazard",
  other: "Other",
};

export default function ResidentPage() {
  const [zone, setZone] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({ type: "missed_collection", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Schedule + today's progress now load inside their own components
  // (CollectionSchedule / ZoneProgress), each with loading/error states.
  async function loadData() {
    const complaintRes = await fetch("/api/complaints");
    const complaintData = await complaintRes.json();
    setComplaints(complaintData.complaints || []);
  }

  useEffect(() => {
    loadData();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setZone(data.user?.zone || null))
      .catch((err) => console.error("ResidentPage loadMe error:", err));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not submit report");
      return;
    }
    setForm({ type: "missed_collection", description: "" });
    loadData();
  }

  return (
    <div className="space-y-8">
      <ZoneProgress />

      <CollectionSchedule zone={zone} />

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
          {error && <p className="text-sm text-clay-600">{error}</p>}
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
                <p className="text-sm font-medium text-loop-900">
                  {TYPE_LABELS[c.type]}
                </p>
                <p className="text-sm text-loop-700">{c.description}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
          {complaints.length === 0 && (
            <p className="card text-sm text-loop-700">No reports submitted yet.</p>
          )}
        </div>
      </section>

      <section>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-loop-950">
              Community campaigns
            </h2>
            <p className="text-sm text-loop-700">
              Join a local clean-up or recycling drive organized by volunteers.
            </p>
          </div>
          <Link href="/campaigns" className="btn-primary shrink-0">
            View campaigns
          </Link>
        </div>
      </section>
    </div>
  );
}
