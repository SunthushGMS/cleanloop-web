"use client";

import { useState } from "react";
import Link from "next/link";

export default function VolunteerPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    zone: "",
    date: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not create campaign");
      return;
    }
    setForm({ title: "", description: "", zone: "", date: "" });
    setSuccess("Campaign published.");
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-loop-950">
              Community campaigns
            </h2>
            <p className="text-sm text-loop-700">
              See upcoming campaigns, RSVP, and check who&apos;s coming.
            </p>
          </div>
          <Link href="/campaigns" className="btn-primary shrink-0">
            View campaigns
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Organize a campaign
        </h2>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="field-label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              required
              className="field-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="field-input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="zone">
                Zone / ward
              </label>
              <input
                id="zone"
                className="field-input"
                value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                className="field-input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          {error && <p className="text-sm text-clay-600">{error}</p>}
          {success && (
            <p className="text-sm text-loop-700">
              {success}{" "}
              <Link href="/campaigns" className="underline">
                View it on the campaigns page
              </Link>
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Publishing..." : "Publish campaign"}
          </button>
        </form>
      </section>
    </div>
  );
}
