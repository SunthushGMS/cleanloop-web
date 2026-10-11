"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";

const TYPE_LABELS = {
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  hazard: "Hazard",
  other: "Other",
};

// Admin tools, rendered as quick-link cards. Not yet wired into the shared
// Navbar — safe to fold in later.
const TOOLS = [
  { href: "/admin/progress", title: "Live progress", body: "Today’s routes, stop by stop, as crews complete them." },
  { href: "/admin/routes", title: "Route builder", body: "Assign zones, stops, crew, and trucks — and change them." },
  { href: "/admin/schedules", title: "Schedules", body: "Draft, publish, and update weekly collection days." },
  { href: "/admin/zones", title: "Zone manager", body: "Define zones/wards and their known stop addresses." },
  { href: "/admin/resources", title: "Resource manager", body: "Track bins, trucks, and PPE — status, condition, zone." },
];

export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);

  async function loadComplaints() {
    const res = await fetch("/api/complaints");
    const data = await res.json();
    setComplaints(data.complaints || []);
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  async function updateStatus(id, status) {
    await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadComplaints();
  }

  const open = complaints.filter((c) => c.status !== "resolved");

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <div key={tool.href} className="card flex flex-col justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-loop-950">
                {tool.title}
              </h2>
              <p className="text-sm text-loop-700">{tool.body}</p>
            </div>
            <Link href={tool.href} className="btn-primary self-start">
              Open
            </Link>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Complaint queue ({open.length} open)
        </h2>
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c._id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-loop-900">
                    {TYPE_LABELS[c.type]}{" "}
                    <span className="text-xs font-normal text-loop-500">
                      &middot; from {c.source} &middot; {c.reportedBy?.name || "unknown"}
                    </span>
                  </p>
                  <p className="text-sm text-loop-700">{c.description}</p>
                  {c.zone && (
                    <p className="mt-1 text-xs text-loop-500">Zone: {c.zone}</p>
                  )}
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 flex gap-2">
                {["open", "in_progress", "resolved"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(c._id, s)}
                    disabled={c.status === s}
                    className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                  >
                    Mark {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {complaints.length === 0 && (
            <p className="card text-sm text-loop-700">No complaints yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}