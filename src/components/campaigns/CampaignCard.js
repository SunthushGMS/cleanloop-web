"use client";

import { useState } from "react";
import { isPastCampaignDate } from "@/lib/campaignDates";
import EditCampaignForm from "@/components/campaigns/EditCampaignForm";

// Only these roles can RSVP — mirrors requireUser in /api/campaigns/[id]/rsvp.
const RSVP_ROLES = ["resident", "volunteer"];

// Campaign dates are stored as UTC midnight of the chosen day, so format them
// in UTC; otherwise users west of UTC would see the previous day.
function formatCampaignDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// editedAt / cancelledAt are real moments, so show them in local time.
function formatMoment(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * One campaign: details, status badges, RSVP button, and — for the organizer
 * or an admin — edit / cancel / delete. Reports changes upward with
 * onChange(updatedCampaign) and onRemove(id) so the list stays in sync.
 */
export default function CampaignCard({ campaign: c, currentUser, onChange, onRemove }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const cancelled = c.status === "cancelled";
  const past = isPastCampaignDate(c.date);
  const attendeeCount = c.attendees?.length || 0;
  const isOrganizer = Boolean(currentUser) && c.organizer === currentUser.id;
  const isAttending =
    Boolean(currentUser) && c.attendees?.some((a) => a.user === currentUser.id);
  const canManage = isOrganizer || currentUser?.role === "admin";
  const canRsvp =
    Boolean(currentUser) &&
    RSVP_ROLES.includes(currentUser.role) &&
    !isOrganizer &&
    !cancelled &&
    !past;

  // Shared wrapper for the card's API calls: busy state + error message.
  async function run(url, method, fallbackError) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(url, { method });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || fallbackError);
        return null;
      }
      return data;
    } catch (err) {
      console.error(`${method} ${url} error:`, err);
      setError(fallbackError);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleRsvpToggle() {
    const data = await run(
      `/api/campaigns/${c._id}/rsvp`,
      isAttending ? "DELETE" : "POST",
      "Could not update RSVP"
    );
    if (data) onChange(data.campaign);
  }

  async function handleCancelCampaign() {
    const who = attendeeCount === 1 ? "1 person has" : `${attendeeCount} people have`;
    const warning = attendeeCount > 0 ? `\n\n${who} RSVP'd; they'll see it marked as cancelled.` : "";
    if (!window.confirm(`Cancel "${c.title}"?${warning}`)) return;
    const data = await run(`/api/campaigns/${c._id}/cancel`, "POST", "Could not cancel campaign");
    if (data) onChange(data.campaign);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${c.title}" permanently? This can't be undone.`)) return;
    const data = await run(`/api/campaigns/${c._id}`, "DELETE", "Could not delete campaign");
    if (data) onRemove(c._id);
  }

  return (
    <div className={`card ${cancelled ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-medium text-loop-900 ${cancelled ? "line-through" : ""}`}
            >
              {c.title}
            </p>
            {cancelled && <span className="badge bg-clay-500/15 text-clay-600">Cancelled</span>}
            {!cancelled && past && <span className="badge bg-loop-100 text-loop-500">Past</span>}
            {!cancelled && c.editedAt && (
              <span
                className="badge bg-amber-500/15 text-amber-600"
                title={`Details changed ${formatMoment(c.editedAt)}`}
              >
                Updated
              </span>
            )}
          </div>
          {c.description && <p className="mt-1 text-sm text-loop-700">{c.description}</p>}
          <p className="mt-1 text-xs text-loop-500">
            {c.zone ? `${c.zone} · ` : ""}
            {formatCampaignDate(c.date)}
          </p>
          <p className="mt-1 text-xs text-loop-500">
            {attendeeCount} {past || cancelled ? "signed up" : "attending"}
            {isOrganizer && " · You're organizing this"}
            {isAttending && !isOrganizer && " · You're signed up"}
          </p>
          {cancelled && c.cancelledAt && (
            <p className="mt-1 text-xs text-clay-600">
              Cancelled by the organizer on {formatMoment(c.cancelledAt)}.
            </p>
          )}
          {!cancelled && c.editedAt && (
            <p className="mt-1 text-xs text-amber-600">
              Details updated {formatMoment(c.editedAt)} — check the date and place.
            </p>
          )}
        </div>

        {canRsvp && (
          <button
            type="button"
            onClick={handleRsvpToggle}
            disabled={busy}
            className={`shrink-0 ${isAttending ? "btn-secondary" : "btn-primary"} disabled:opacity-60`}
          >
            {busy ? "..." : isAttending ? "Cancel RSVP" : "I'm coming"}
          </button>
        )}
      </div>

      {canManage && !cancelled && !editing && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-loop-200 pt-4">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            className="btn-secondary px-3 py-1 text-xs"
          >
            Edit
          </button>
          {!past && (
            <button
              type="button"
              onClick={handleCancelCampaign}
              disabled={busy}
              className="btn-secondary px-3 py-1 text-xs"
            >
              Cancel campaign
            </button>
          )}
          {attendeeCount === 0 && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="btn-secondary px-3 py-1 text-xs text-clay-600"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {editing && (
        <EditCampaignForm
          campaign={c}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onChange(updated);
          }}
        />
      )}

      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}
    </div>
  );
}
