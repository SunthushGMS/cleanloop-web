"use client";

import { useEffect, useState } from "react";
import CampaignCard from "@/components/campaigns/CampaignCard";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
      // Without the user the list still renders; RSVP and organizer actions stay hidden.
      console.error("Load current user error:", err);
    }
  }

  useEffect(() => {
    loadCampaigns();
    loadCurrentUser();
  }, []);

  function replaceCampaign(updated) {
    setCampaigns((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  }

  function removeCampaign(id) {
    setCampaigns((prev) => prev.filter((c) => c._id !== id));
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Upcoming campaigns
        </h2>

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
              <CampaignCard
                key={c._id}
                campaign={c}
                currentUser={currentUser}
                onChange={replaceCampaign}
                onRemove={removeCampaign}
              />
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
