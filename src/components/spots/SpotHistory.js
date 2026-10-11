"use client";

import { useEffect, useState } from "react";
import ConditionBadge from "@/components/spots/ConditionBadge";

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A spot's check-in history, newest first. Pass `refreshKey` and change it
 * to reload (e.g. after a new check-in).
 */
export default function SpotHistory({ spotId, refreshKey = 0 }) {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/spots/${spotId}/checkins`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Could not load history");
          return;
        }
        setCheckIns(data.checkIns || []);
      } catch (err) {
        console.error("Load spot history error:", err);
        if (!cancelled) setError("Could not load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [spotId, refreshKey]);

  if (loading) return <p className="text-xs text-loop-500">Loading history...</p>;
  if (error) return <p className="text-xs text-clay-600">{error}</p>;
  if (checkIns.length === 0) {
    return <p className="text-xs text-loop-500">No check-ins yet.</p>;
  }

  return (
    <ul className="divide-y divide-loop-100">
      {checkIns.map((c) => (
        <li key={c._id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
          <span className="w-24 shrink-0 font-mono text-xs text-loop-500">
            {formatDate(c.createdAt)}
          </span>
          <ConditionBadge condition={c.condition} />
          <span className="min-w-0 flex-1 text-sm text-loop-700">
            {c.note || <span className="text-loop-400">No note</span>}
            <span className="text-xs text-loop-500"> · {c.volunteer?.name || "Volunteer"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
