"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CampaignCard from "@/components/campaigns/CampaignCard";

// Each tab is one GET /api/campaigns query. `roles` = who sees the tab.
const TABS = {
  upcoming: {
    label: "Upcoming",
    query: "scope=all&when=upcoming",
    empty: "No upcoming campaigns yet.",
  },
  mine: {
    label: "My campaigns",
    query: "scope=mine&when=all",
    empty: "You haven't organized any campaigns yet.",
    roles: ["volunteer"],
  },
  joined: {
    label: "Campaigns I joined",
    query: "scope=joined&when=all",
    empty: "You haven't RSVP'd to any campaigns yet.",
    roles: ["resident", "volunteer"],
  },
};

function visibleTabs(user) {
  return Object.keys(TABS).filter((key) => !TABS[key].roles || TABS[key].roles.includes(user?.role));
}

export default function CampaignsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<p className="card text-sm text-loop-500">Loading campaigns...</p>}>
      <CampaignsView />
    </Suspense>
  );
}

function CampaignsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const requested = searchParams.get("tab");
  const tabs = visibleTabs(currentUser);
  // Fall back to "upcoming" for unknown tabs or ones this role can't see.
  const tab = userLoaded && tabs.includes(requested) ? requested : "upcoming";

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/campaigns?${TABS[tab].query}`);
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
  }, [tab]);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setCurrentUser(data.user || null);
      } catch (err) {
        // Without the user the list still renders; RSVP and organizer actions stay hidden.
        console.error("Load current user error:", err);
      } finally {
        setUserLoaded(true);
      }
    }
    loadCurrentUser();
  }, []);

  useEffect(() => {
    // Wait for the user so a ?tab=mine link doesn't flash the Upcoming list first.
    if (userLoaded) loadCampaigns();
  }, [userLoaded, loadCampaigns]);

  function selectTab(key) {
    router.replace(key === "upcoming" ? "/campaigns" : `/campaigns?tab=${key}`, { scroll: false });
  }

  function replaceCampaign(updated) {
    setCampaigns((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  }

  function removeCampaign(id) {
    setCampaigns((prev) => prev.filter((c) => c._id !== id));
  }

  return (
    <div className="space-y-6">
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Campaign lists" className="flex flex-wrap gap-2">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => selectTab(key)}
              className={`${tab === key ? "btn-primary" : "btn-secondary"} px-4 py-1.5 text-xs`}
            >
              {TABS[key].label}
            </button>
          ))}
        </div>
      )}

      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          {tab === "upcoming" ? "Upcoming campaigns" : TABS[tab].label}
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
            {tab === "mine" && campaigns.length > 0 && <ImpactSummary campaigns={campaigns} />}
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
              <p className="card text-sm text-loop-700">{TABS[tab].empty}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// Totals across the organizer's campaigns — the "impact record" headline.
function ImpactSummary({ campaigns }) {
  const active = campaigns.filter((c) => c.status !== "cancelled");
  const signUps = active.reduce((sum, c) => sum + (c.attendees?.length || 0), 0);
  const bags = active.reduce((sum, c) => sum + (c.outcome?.bagsCollected || 0), 0);
  const kg = active.reduce((sum, c) => sum + (c.outcome?.kgCollected || 0), 0);
  const stats = [
    { label: "Campaigns", value: active.length },
    { label: "Sign-ups", value: signUps },
    { label: "Bags collected", value: bags },
    { label: "Approx. kg", value: Math.round(kg * 10) / 10 },
  ];
  return (
    <div className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="manifest-label text-loop-500">{s.label}</p>
          <p className="font-display text-2xl font-bold text-loop-950">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
