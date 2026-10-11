"use client";

import { useEffect, useState } from "react";

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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rsvpingId, setRsvpingId] = useState(null);
  const [rsvpError, setRsvpError] = useState("");

  async function loadCampaigns() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Could not load campaigns");
        return;
      }
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Load campaigns error:", err);
      setLoadError("Could not load campaigns. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user || null);
    } catch (err) {
      // Without the user the list still renders; RSVP buttons just stay hidden.
      console.error("Load current user error:", err);
    }
  }

  useEffect(() => {
    loadCampaigns();
    loadCurrentUser();
  }, []);

  function isAttending(campaign) {
    if (!currentUser) return false;
    return campaign.attendees?.some((a) => a.user === currentUser.id);
  }

  function isOrganizer(campaign) {
    if (!currentUser) return false;
    return campaign.organizer === currentUser.id;
  }

  function canRsvp(campaign) {
    return (
      Boolean(currentUser) &&
      RSVP_ROLES.includes(currentUser.role) &&
      !isOrganizer(campaign)
    );
  }

  async function handleRsvpToggle(campaign) {
    setRsvpError("");
    setRsvpingId(campaign._id);
    const method = isAttending(campaign) ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/campaigns/${campaign._id}/rsvp`, { method });
      const data = await res.json();
      if (!res.ok) {
        setRsvpError(data.error || "Could not update RSVP");
        return;
      }
      setCampaigns((prev) =>
        prev.map((c) => (c._id === campaign._id ? data.campaign : c))
      );
    } catch (err) {
      console.error("RSVP toggle error:", err);
      setRsvpError("Could not update RSVP");
    } finally {
      setRsvpingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Upcoming campaigns
        </h2>
        {rsvpError && <p className="text-sm text-clay-600 mb-3">{rsvpError}</p>}

        {loading ? (
          <p className="card text-sm text-loop-500">Loading campaigns...</p>
        ) : loadError ? (
          <div className="card flex items-center justify-between gap-4">
            <p className="text-sm text-clay-600">{loadError}</p>
            <button type="button" onClick={loadCampaigns} className="btn-secondary shrink-0">
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c._id} className="card flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-loop-900">{c.title}</p>
                  {c.description && (
                    <p className="text-sm text-loop-700">{c.description}</p>
                  )}
                  <p className="mt-1 text-xs text-loop-500">
                    {c.zone ? `${c.zone} · ` : ""}
                    {formatCampaignDate(c.date)}
                  </p>
                  <p className="mt-1 text-xs text-loop-500">
                    {c.attendees?.length || 0} attending
                    {isOrganizer(c) && " · You're organizing this"}
                  </p>
                </div>
                {canRsvp(c) && (
                  <button
                    type="button"
                    onClick={() => handleRsvpToggle(c)}
                    disabled={rsvpingId === c._id}
                    className={`shrink-0 ${isAttending(c) ? "btn-secondary" : "btn-primary"}`}
                  >
                    {rsvpingId === c._id
                      ? "..."
                      : isAttending(c)
                      ? "Cancel RSVP"
                      : "I'm coming"}
                  </button>
                )}
              </div>
            ))}
            {campaigns.length === 0 && (
              <p className="card text-sm text-loop-700">No upcoming campaigns yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
