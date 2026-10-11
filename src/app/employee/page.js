"use client";

import { useEffect, useState } from "react";
import TodayRoute from "@/components/employee/TodayRoute";

export default function EmployeePage() {
  // Route history state — kept separate from TodayRoute's own fetch/state,
  // since these are two different queries (GET /api/routes/today vs.
  // GET /api/routes) answering two different questions.
  const [routes, setRoutes] = useState([]);
  const [hazardForm, setHazardForm] = useState({ description: "" });
  const [hazardMsg, setHazardMsg] = useState("");

  async function loadRoutes() {
    const res = await fetch("/api/routes");
    const data = await res.json();
    setRoutes(data.routes || []);
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  async function submitHazard(e) {
    e.preventDefault();
    setHazardMsg("");
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "hazard", description: hazardForm.description }),
    });
    if (res.ok) {
      setHazardMsg("Hazard reported to operations.");
      setHazardForm({ description: "" });
    } else {
      const data = await res.json();
      setHazardMsg(data.error || "Could not report hazard.");
    }
  }

  return (
    <div className="space-y-8">
      {/* Primary user story: "view my assigned route for the day" */}
      <TodayRoute />

      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Flag a hazard or blocked bin
        </h2>
        <form onSubmit={submitHazard} className="card space-y-4">
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
              onChange={(e) => setHazardForm({ description: e.target.value })}
            />
          </div>
          {hazardMsg && <p className="text-sm text-loop-700">{hazardMsg}</p>}
          <button type="submit" className="btn-primary">
            Report to operations
          </button>
        </form>
      </section>

      {/* Secondary: full route history, not just today's. Uses the
          original GET /api/routes endpoint, unchanged. */}
      <section>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Route history
        </h2>
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route._id} className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-loop-900">
                  {route.zone} &middot;{" "}
                  {new Date(route.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                </p>
                <span className="text-xs text-loop-500">
                  {route.stops.filter((s) => s.completed).length}/{route.stops.length}{" "}
                  complete
                </span>
              </div>
            </div>
          ))}
          {routes.length === 0 && (
            <p className="card text-sm text-loop-700">No routes assigned yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}