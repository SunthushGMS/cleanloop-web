"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";

const EMPTY_FORM = { title: "", description: "", zone: "", date: "" };

// Today in the user's own time zone, as "YYYY-MM-DD" to match <input type="date">.
function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function VolunteerPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => {
      const { value } = e.target;
      setForm((f) => ({ ...f, [field]: value }));
      // Clear a field's error as soon as the user edits it.
      setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess("");

    // "YYYY-MM-DD" strings compare correctly as plain strings.
    if (form.date && form.date < localToday()) {
      setFieldErrors({ date: ["Campaign date can't be in the past"] });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
          setError("Please fix the highlighted fields.");
        } else {
          setError(data.error || "Could not create campaign");
        }
        return;
      }
      setForm(EMPTY_FORM);
      setSuccess("Campaign published.");
    } catch (err) {
      console.error("Create campaign error:", err);
      setError("Could not create campaign. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Volunteer portal"
        description="Organize clean-up campaigns and rally your neighbours."
        actions={
          <Link href="/campaigns" className="btn-secondary">
            Browse campaigns
          </Link>
        }
      />
      <section>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-loop-950">
              Community campaigns
            </h2>
            <p className="text-sm text-loop-700">
              See upcoming campaigns, manage the ones you organize, and record
              what they achieved.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Link href="/campaigns?tab=mine" className="btn-secondary">
              My campaigns
            </Link>
            <Link href="/campaigns" className="btn-primary">
              View campaigns
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-loop-950">
              Adopt-a-Spot
            </h2>
            <p className="text-sm text-loop-700">
              Look after a dumping hotspot, check it every week or two, and report new
              problem places.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Link href="/volunteer/spots?tab=report" className="btn-secondary">
              Report a spot
            </Link>
            <Link href="/volunteer/spots" className="btn-primary">
              My spots
            </Link>
          </div>
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
              minLength={3}
              maxLength={120}
              className="field-input"
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}
              value={form.title}
              onChange={update("title")}
            />
            <FieldError id="title-error" messages={fieldErrors.title} />
          </div>
          <div>
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={1000}
              className="field-input"
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "description-error" : undefined}
              value={form.description}
              onChange={update("description")}
            />
            <FieldError id="description-error" messages={fieldErrors.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="zone">
                Zone / ward
              </label>
              <input
                id="zone"
                maxLength={80}
                className="field-input"
                aria-invalid={Boolean(fieldErrors.zone)}
                aria-describedby={fieldErrors.zone ? "zone-error" : undefined}
                value={form.zone}
                onChange={update("zone")}
              />
              <FieldError id="zone-error" messages={fieldErrors.zone} />
            </div>
            <div>
              <label className="field-label" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                min={localToday()}
                className="field-input"
                aria-invalid={Boolean(fieldErrors.date)}
                aria-describedby={fieldErrors.date ? "date-error" : undefined}
                value={form.date}
                onChange={update("date")}
              />
              <FieldError id="date-error" messages={fieldErrors.date} />
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
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? "Publishing..." : "Publish campaign"}
          </button>
        </form>
      </section>
    </div>
  );
}

function FieldError({ id, messages }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1 text-xs text-clay-600">
      {messages.join(" ")}
    </p>
  );
}
