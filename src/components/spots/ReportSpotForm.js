"use client";

import { useEffect, useState } from "react";
import { resizeImage } from "@/lib/resizeImage";
import { MAX_PENDING_REQUESTS } from "@/lib/spotConstants";

const EMPTY = { landmark: "", street: "", zone: "", description: "", wantsToAdopt: true };

/**
 * Volunteer form to propose a recurring dumping spot for admin review.
 * The optional photo is resized in the browser before upload.
 */
export default function ReportSpotForm({ onSubmitted }) {
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null); // resized File
  const [preview, setPreview] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Free the preview's object URL when it changes or the form unmounts.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    setFieldErrors((errs) => ({ ...errs, photo: undefined }));
    setPhoto(null);
    setPreview("");
    if (!file) return;
    setPhotoBusy(true);
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
      setPreview(URL.createObjectURL(resized));
    } catch (err) {
      setFieldErrors((errs) => ({ ...errs, photo: [err.message] }));
      e.target.value = "";
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);

    const body = new FormData();
    body.set("landmark", form.landmark);
    body.set("street", form.street);
    body.set("zone", form.zone);
    body.set("description", form.description);
    body.set("wantsToAdopt", form.wantsToAdopt ? "true" : "false");
    if (photo) body.set("photo", photo);

    try {
      const res = await fetch("/api/spot-requests", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setFieldErrors(data.details);
          setError("Please fix the highlighted fields.");
        } else {
          setError(data.error || "Could not send your request");
        }
        return;
      }
      setForm(EMPTY);
      setPhoto(null);
      setPreview("");
      e.target.reset();
      onSubmitted(data.request);
    } catch (err) {
      console.error("Submit spot request error:", err);
      setError("Could not send your request. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <p className="text-sm text-loop-700">
        Know a place where dumping keeps coming back? Tell operations about it. An admin
        reviews every request; you can have up to {MAX_PENDING_REQUESTS} waiting at once.
      </p>
      <div>
        <label className="field-label" htmlFor="landmark">Landmark or name</label>
        <input id="landmark" required minLength={3} maxLength={120} placeholder="e.g. Canal bridge corner" className="field-input" value={form.landmark} onChange={update("landmark")} />
        <FieldError messages={fieldErrors.landmark} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="street">Street</label>
          <input id="street" maxLength={160} placeholder="e.g. Canal Road" className="field-input" value={form.street} onChange={update("street")} />
          <FieldError messages={fieldErrors.street} />
        </div>
        <div>
          <label className="field-label" htmlFor="spot-zone">Zone / ward</label>
          <input id="spot-zone" required maxLength={80} placeholder="e.g. Ward 4" className="field-input" value={form.zone} onChange={update("zone")} />
          <FieldError messages={fieldErrors.zone} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="spot-description">What happens there?</label>
        <textarea id="spot-description" rows={3} maxLength={1000} placeholder="e.g. Household waste is left near the lamp post most weekends" className="field-input" value={form.description} onChange={update("description")} />
        <FieldError messages={fieldErrors.description} />
      </div>
      <div>
        <label className="field-label" htmlFor="spot-photo">Photo (optional)</label>
        <input id="spot-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="block w-full text-sm text-loop-700 file:mr-3 file:rounded-[3px] file:border file:border-loop-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-loop-900" />
        <p className="mt-1 text-xs text-loop-500">
          JPG, PNG or WebP. It&apos;s shrunk before upload and its location data removed. Only
          admins and you can see it.
        </p>
        {photoBusy && <p className="mt-1 text-xs text-loop-500">Preparing photo...</p>}
        <FieldError messages={fieldErrors.photo} />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo preview" className="mt-2 h-32 rounded-[3px] border border-loop-200 object-cover" />
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-loop-900">
        <input type="checkbox" checked={form.wantsToAdopt} onChange={update("wantsToAdopt")} className="h-4 w-4 accent-amber-500" />
        I&apos;ll adopt this spot if it&apos;s approved
      </label>
      {error && <p className="text-sm text-clay-600">{error}</p>}
      <button type="submit" disabled={submitting || photoBusy} className="btn-primary disabled:opacity-60">
        {submitting ? "Sending..." : "Send for review"}
      </button>
    </form>
  );
}

function FieldError({ messages }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-clay-600">{messages.join(" ")}</p>;
}
