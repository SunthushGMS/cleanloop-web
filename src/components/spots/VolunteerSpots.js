"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MySpotCard from "@/components/spots/MySpotCard";
import ReportSpotForm from "@/components/spots/ReportSpotForm";
import ConditionBadge from "@/components/spots/ConditionBadge";

const TABS = {
  mine: "My spots",
  open: "Needing a volunteer",
  report: "Report a spot",
  requests: "My requests",
};

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-loop-700/15 text-loop-700",
  merged: "bg-loop-100 text-loop-700",
  rejected: "bg-clay-500/15 text-clay-600",
  withdrawn: "bg-loop-100 text-loop-500",
};

/** Volunteer page body for Adopt-a-Spot. The tab lives in the URL (?tab=open). */
export default function VolunteerSpots() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS[requested] ? requested : "mine";

  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user || null))
      .catch((err) => console.error("Load current user error:", err));
  }, []);

  // silent: refresh in the background without the "Loading..." state, so
  // cards (and their "check-in saved" messages) aren't rebuilt.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (tab === "report") {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError("");
    try {
      const url =
        tab === "requests"
          ? "/api/spot-requests"
          : `/api/spots?view=${tab === "mine" ? "mine" : "unadopted"}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load");
        return;
      }
      setItems(tab === "requests" ? data.requests || [] : data.spots || []);
    } catch (err) {
      console.error("Volunteer spots load error:", err);
      setError("Could not load. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  function selectTab(key) {
    setNotice("");
    router.replace(key === "mine" ? "/volunteer/spots" : `/volunteer/spots?tab=${key}`, { scroll: false });
  }

  async function adopt(spot) {
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/spots/${spot._id}/adopt`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not adopt spot");
        load();
        return;
      }
      setItems((prev) => prev.filter((s) => s._id !== spot._id));
      setNotice(`You've adopted "${spot.name}". Find it under My spots to check in.`);
    } catch (err) {
      console.error("Adopt spot error:", err);
      setError("Could not adopt spot");
    }
  }

  async function withdraw(request) {
    if (!window.confirm(`Withdraw your request for "${request.landmark}"?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/spot-requests/${request._id}/withdraw`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not withdraw request");
        load();
        return;
      }
      setItems((prev) => prev.map((r) => (r._id === request._id ? { ...r, ...data.request } : r)));
    } catch (err) {
      console.error("Withdraw request error:", err);
      setError("Could not withdraw request");
    }
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Adopt-a-Spot" className="flex flex-wrap gap-2">
        {Object.entries(TABS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={`${tab === key ? "btn-primary" : "btn-secondary"} px-4 py-1.5 text-xs`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && <p className="card text-sm text-loop-700">{notice}</p>}

      {tab === "report" ? (
        <ReportSpotForm
          onSubmitted={() => {
            selectTab("requests");
            setNotice("Thanks! Your request is waiting for review. You'll see the decision here.");
          }}
        />
      ) : loading ? (
        <p className="card text-sm text-loop-500">Loading...</p>
      ) : error && items.length === 0 ? (
        <div className="card flex items-center justify-between gap-4">
          <p className="text-sm text-clay-600">{error}</p>
          <button type="button" onClick={load} className="btn-secondary shrink-0">
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-clay-600">{error}</p>}

          {tab === "mine" &&
            items.map((s) => (
              <MySpotCard
                key={s._id}
                spot={s}
                onChange={() => load({ silent: true })}
                onReleased={(id) => {
                  setItems((prev) => prev.filter((x) => x._id !== id));
                  setNotice("Spot released. Thanks for looking after it.");
                }}
              />
            ))}

          {tab === "open" &&
            items.map((s) => (
              <div key={s._id} className="card flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-loop-900">{s.name}</p>
                  <p className="text-xs text-loop-500">{[s.street, s.zone].filter(Boolean).join(" · ")}</p>
                  {s.description && <p className="mt-1 text-sm text-loop-700">{s.description}</p>}
                  {s.lastCheckIn && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-loop-500">
                      Last seen: <ConditionBadge condition={s.lastCheckIn.condition} />
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => adopt(s)} className="btn-primary shrink-0">
                  Adopt this spot
                </button>
              </div>
            ))}

          {tab === "requests" &&
            items.map((r) => <RequestRow key={r._id} request={r} me={me} onWithdraw={withdraw} />)}

          {items.length === 0 && (
            <p className="card text-sm text-loop-700">
              {tab === "mine" && "You haven't adopted any spots yet. Pick one from “Needing a volunteer”, or report a new one."}
              {tab === "open" && "Every approved spot has a volunteer right now. Know another problem place? Report it."}
              {tab === "requests" && "You haven't reported any spots yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({ request: r, me, onWithdraw }) {
  const spot = r.spot;
  const adopterId = spot?.adopter?._id;
  const youAdopted = Boolean(me && adopterId === me.id);

  let detail = null;
  if (r.status === "pending") detail = "Waiting for an admin to review it.";
  if (r.status === "approved" && spot) {
    detail = `Approved as “${spot.name}”.${youAdopted ? " You're its adopter." : ""}`;
  }
  if (r.status === "merged" && spot) {
    const who = youAdopted
      ? "You're its adopter."
      : spot.adopter
      ? `Already adopted by ${spot.adopter.name}.`
      : "It has no volunteer yet, so you can adopt it.";
    detail = `Someone had already reported this place, so it was merged into “${spot.name}”. ${who}`;
  }
  if (r.status === "rejected") detail = `Not approved: ${r.rejectReason}`;
  if (r.status === "withdrawn") detail = "You withdrew this request.";

  return (
    <div className="card flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-loop-900">{r.landmark}</p>
          <span className={`badge ${STATUS_STYLES[r.status] || ""}`}>{r.status}</span>
        </div>
        <p className="text-xs text-loop-500">
          {[r.street, r.zone].filter(Boolean).join(" · ")} · sent{" "}
          {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
        {detail && (
          <p className={`mt-1 text-sm ${r.status === "rejected" ? "text-clay-600" : "text-loop-700"}`}>
            {detail}
          </p>
        )}
        {r.status === "pending" && (
          <button type="button" onClick={() => onWithdraw(r)} className="mt-2 text-xs text-clay-600 underline">
            Withdraw request
          </button>
        )}
      </div>
      {r.hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/spot-requests/${r._id}/photo`}
          alt={`Your photo of ${r.landmark}`}
          className="h-20 w-28 shrink-0 rounded-[3px] border border-loop-200 object-cover"
        />
      )}
    </div>
  );
}
