"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";

const TYPE_LABELS = {
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  hazard: "Hazard",
  other: "Other",
};

export default function EmployeePage() {
  const [routes, setRoutes] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [hazardForm, setHazardForm] = useState({ description: "", zone: "" });
  const [hazardMsg, setHazardMsg] = useState("");
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesText, setNotesText] = useState("");

  async function loadRoutes() {
    const res = await fetch("/api/routes");
    const data = await res.json();
    setRoutes(data.routes || []);
  }

  async function loadComplaints() {
    try {
      const res = await fetch("/api/complaints");
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (e) {
      console.error("Failed to load employee complaints", e);
    }
  }

  useEffect(() => {
    loadRoutes();
    loadComplaints();
  }, []);

  async function completeStop(routeId, stopId) {
    await fetch(`/api/routes/${routeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopId }),
    });
    loadRoutes();
  }

  async function updateComplaintStatus(id, status, notes = undefined) {
    const body = { status };
    if (notes !== undefined) body.resolutionNotes = notes;

    await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditingNotesId(null);
    setNotesText("");
    loadComplaints();
  }

  async function submitHazard(e) {
    e.preventDefault();
    setHazardMsg("");
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "hazard",
        description: hazardForm.description,
        zone: hazardForm.zone || null,
      }),
    });
    if (res.ok) {
      setHazardMsg("Hazard reported to operations.");
      setHazardForm({ description: "", zone: "" });
      loadComplaints();
    } else {
      const data = await res.json();
      setHazardMsg(data.error || "Could not report hazard.");
    }
  }

  return (
    <div className="space-y-8">
      {/* --- Assigned Complaints / Hazards --- */}
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Assigned Tasks & Hazards ({complaints.length})
        </h2>
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c._id} className="card space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-loop-900">
                      {TYPE_LABELS[c.type] || c.type}
                    </span>
                    {c.zone && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-900">
                        Zone: {c.zone}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-loop-800">{c.description}</p>
                  
                  {c.resolutionNotes && (
                    <div className="p-2.5 rounded bg-loop-100/70 text-xs text-loop-900 border-l-2 border-loop-700 mt-2">
                      <strong>Resolution Notes:</strong> {c.resolutionNotes}
                    </div>
                  )}

                  <p className="text-xs text-loop-500 pt-1">
                    Reported by {c.reportedBy?.name || "User"} &middot;{" "}
                    {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {editingNotesId === c._id && (
                <div className="p-3 bg-white rounded border border-loop-300 space-y-2">
                  <label className="field-label text-xs">Add Action / Completion Notes:</label>
                  <textarea
                    rows={2}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="e.g. Cleared blocked bin and notified ward supervisor."
                    className="field-input text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingNotesId(null);
                        setNotesText("");
                      }}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateComplaintStatus(c._id, c.status, notesText)}
                      className="btn-primary text-xs py-1 px-2.5"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-loop-100 flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setEditingNotesId(c._id);
                    setNotesText(c.resolutionNotes || "");
                  }}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  💬 Add Notes
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => updateComplaintStatus(c._id, "in_progress")}
                    disabled={c.status === "in_progress"}
                    className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => updateComplaintStatus(c._id, "resolved")}
                    disabled={c.status === "resolved"}
                    className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ))}

          {complaints.length === 0 && (
            <p className="card text-sm text-loop-700">No complaints or hazards assigned to you yet.</p>
          )}
        </div>
      </section>

      {/* --- Assigned Routes --- */}
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Your assigned routes
        </h2>
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route._id} className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-loop-900">
                  {route.zone} &middot; {new Date(route.date).toLocaleDateString()}
                </p>
                <span className="text-xs text-loop-500">
                  {route.stops.filter((s) => s.completed).length}/{route.stops.length}{" "}
                  complete
                </span>
              </div>
              <ul className="mt-3 divide-y divide-loop-100">
                {route.stops.map((stop) => (
                  <li key={stop._id} className="flex items-center justify-between py-2">
                    <span
                      className={`text-sm ${
                        stop.completed ? "text-loop-300 line-through" : "text-loop-900"
                      }`}
                    >
                      {stop.label}
                    </span>
                    {!stop.completed && (
                      <button
                        onClick={() => completeStop(route._id, stop._id)}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Mark complete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {routes.length === 0 && (
            <p className="card text-sm text-loop-700">No routes assigned yet.</p>
          )}
        </div>
      </section>

      {/* --- Flag Hazard --- */}
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Flag a hazard or blocked bin
        </h2>
        <form onSubmit={submitHazard} className="card space-y-4">
          <div>
            <label className="field-label" htmlFor="zone">
              Zone / Ward (optional)
            </label>
            <input
              id="zone"
              type="text"
              placeholder="e.g. Zone 3 — Elm St"
              className="field-input"
              value={hazardForm.zone}
              onChange={(e) => setHazardForm((f) => ({ ...f, zone: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="description">
              What did you find?
            </label>
            <textarea
              id="description"
              required
              minLength={5}
              rows={3}
              className="field-input"
              value={hazardForm.description}
              onChange={(e) => setHazardForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {hazardMsg && <p className="text-sm text-loop-700">{hazardMsg}</p>}
          <button type="submit" className="btn-primary">
            Report to operations
          </button>
        </form>
      </section>
    </div>
  );
}
