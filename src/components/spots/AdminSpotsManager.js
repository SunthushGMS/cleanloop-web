"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequestReviewCard from "@/components/spots/RequestReviewCard";
import AdminSpotsTable from "@/components/spots/AdminSpotsTable";

const STATUS_FILTERS = ["pending", "approved", "merged", "rejected", "withdrawn", "all"];

/**
 * Admin page body for Adopt-a-Spot: a Requests tab (review queue) and a
 * Spots tab (overview). The tab lives in the URL (?tab=spots).
 */
export default function AdminSpotsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "spots" ? "spots" : "requests";

  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingCount, setPendingCount] = useState(null);

  const loadSpots = useCallback(async () => {
    const res = await fetch("/api/spots?view=all");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load spots");
    setSpots(data.spots || []);
  }, []);

  const loadRequests = useCallback(async () => {
    const res = await fetch(`/api/admin/spot-requests?status=${status}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load requests");
    setRequests(data.requests || []);
    if (status === "pending") setPendingCount((data.requests || []).length);
  }, [status]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Spots are needed on both tabs (the merge picker uses them).
      await Promise.all([loadSpots(), tab === "requests" ? loadRequests() : null]);
    } catch (err) {
      console.error("Admin spots load error:", err);
      setError(err.message || "Could not load data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [loadSpots, loadRequests, tab]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function selectTab(key) {
    router.replace(key === "requests" ? "/admin/spots" : "/admin/spots?tab=spots", { scroll: false });
  }

  async function handleReviewed(id, data) {
    if (status === "pending") {
      setRequests((prev) => prev.filter((r) => r._id !== id));
      setPendingCount((n) => (n === null ? n : Math.max(0, n - 1)));
    } else if (data.request) {
      setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, ...data.request } : r)));
    }
    // A new or newly adopted spot changes the merge picker and the overview.
    try {
      await loadSpots();
    } catch (err) {
      console.error("Reload spots error:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Adopt-a-Spot" className="flex flex-wrap gap-2">
        {[
          ["requests", `Requests${pendingCount ? ` (${pendingCount})` : ""}`],
          ["spots", "Spots"],
        ].map(([key, label]) => (
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

      {tab === "requests" && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="request-status" className="text-xs text-loop-500">
            Show
          </label>
          <select
            id="request-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input w-auto py-1 text-xs capitalize"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="card text-sm text-loop-500">Loading...</p>
      ) : error ? (
        <div className="card flex items-center justify-between gap-4">
          <p className="text-sm text-clay-600">{error}</p>
          <button type="button" onClick={loadAll} className="btn-secondary shrink-0">
            Try again
          </button>
        </div>
      ) : tab === "requests" ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestReviewCard key={r._id} request={r} allSpots={spots} onReviewed={handleReviewed} />
          ))}
          {requests.length === 0 && (
            <p className="card text-sm text-loop-700">
              {status === "pending" ? "No requests waiting for review." : `No ${status === "all" ? "" : status + " "}requests.`}
            </p>
          )}
        </div>
      ) : (
        <AdminSpotsTable
          spots={spots}
          onSpotsChanged={() => loadSpots().catch((err) => setError(err.message))}
        />
      )}
    </div>
  );
}
