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

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    zone: "",
    dayOfWeek: "Monday",
    wasteType: "general",
  });
  const [scheduleMsg, setScheduleMsg] = useState("");

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

  async function handleScheduleSubmit(e) {
    e.preventDefault();
    setScheduleMsg("");
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduleForm),
    });
    if (res.ok) {
      setScheduleMsg("Schedule published.");
      setScheduleForm({ zone: "", dayOfWeek: "Monday", wasteType: "general" });
    } else {
      const data = await res.json();
      setScheduleMsg(data.error || "Could not publish schedule.");
    }
  }

  const open = complaints.filter((c) => c.status !== "resolved");

  return (
    <div className="space-y-8">
      {/* --- Quick links -----------------------------------------------
          Added so /admin/resources is reachable without waiting on a
          Navbar edit. Safe to remove this section once "Resources" is
          wired into the shared nav instead — it's just a card, no state
          or logic tied to it. */}
      <section>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-loop-950">
              Resource manager
            </h2>
            <p className="text-sm text-loop-700">
              Track bins, trucks, and PPE — status, condition, and zone assignment.
            </p>
          </div>
          <Link href="/admin/resources" className="btn-primary shrink-0">
            Open
          </Link>
        </div>
      </section>

      {/* Adopt-a-Spot (volunteer feature): link card only, no state or
          logic here. The page itself is src/app/admin/spots/page.js. */}
      <section>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-loop-950">
              Dumping spots
            </h2>
            <p className="text-sm text-loop-700">
              Review volunteers&apos; spot requests and see which spots are stale or need attention.
            </p>
          </div>
          <Link href="/admin/spots" className="btn-primary shrink-0">
            Open
          </Link>
        </div>
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

      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Publish a collection schedule
        </h2>
        <form onSubmit={handleScheduleSubmit} className="card space-y-4 max-w-md">
          <div>
            <label className="field-label" htmlFor="zone">
              Zone / ward
            </label>
            <input
              id="zone"
              required
              className="field-input"
              value={scheduleForm.zone}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, zone: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label" htmlFor="dayOfWeek">
              Collection day
            </label>
            <select
              id="dayOfWeek"
              className="field-input"
              value={scheduleForm.dayOfWeek}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, dayOfWeek: e.target.value }))
              }
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="wasteType">
              Waste type
            </label>
            <select
              id="wasteType"
              className="field-input"
              value={scheduleForm.wasteType}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, wasteType: e.target.value }))
              }
            >
              <option value="general">General</option>
              <option value="recycling">Recycling</option>
              <option value="organic">Organic</option>
            </select>
          </div>
          {scheduleMsg && <p className="text-sm text-loop-700">{scheduleMsg}</p>}
          <button type="submit" className="btn-primary">
            Publish schedule
          </button>
        </form>
      </section>
    </div>
  );
}