"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function todayISODate() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function emptyForm(carryOver = {}) {
  return {
    zone: "",
    date: todayISODate(),
    assignedTo: "",
    crew: [], // CPT-39: helper crew member ids
    vehicle: "", // CPT-39: truck Resource id ("" = none)
    stops: [""], // each entry is a stop LABEL chosen from the zone's dropdown
    reason: "", // CPT-44: optional reason sent to the crew on edits
    ...carryOver,
  };
}

// Route dates are stored as UTC midnight of a calendar day.
function routeDateLabel(date) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function errorText(data, fallback) {
  const detailMsg = data?.details ? Object.values(data.details).flat().join(" ") : "";
  return (data?.error || fallback) + (detailMsg ? ` ${detailMsg}` : "");
}

function truckLabel(truck) {
  if (!truck) return "";
  const plate = truck.meta?.plate || truck.identifier;
  return plate ? `${truck.name} (${plate})` : truck.name;
}

/**
 * RouteBuilder
 * ---------------------------------------------------------------------
 * Admin builds a route: zone, date, ordered stops, a lead crew member,
 * plus (CPT-39) helper crew and a truck. Existing routes can be edited
 * in place (CPT-44 Route Change Management) — the API records each
 * change and notifies the affected crew.
 */
export default function RouteBuilder() {
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState("");

  // Zones drive BOTH the zone dropdown and every stop row's dropdown.
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState("");

  const [trucks, setTrucks] = useState([]);

  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState("");

  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null); // route being edited, or null
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [expandedLog, setExpandedLog] = useState(null);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    setEmployeesError("");
    try {
      const res = await fetch("/api/admin/employees", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load crew members");
      setEmployees(data.employees || []);
    } catch (err) {
      console.error("loadEmployees error:", err);
      setEmployeesError(err.message);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const loadZones = useCallback(async () => {
    setZonesLoading(true);
    setZonesError("");
    try {
      const res = await fetch("/api/zones", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load zones");
      setZones(data.zones || []);
    } catch (err) {
      console.error("loadZones error:", err);
      setZonesError(err.message);
    } finally {
      setZonesLoading(false);
    }
  }, []);

  // All trucks (not just active), so an existing route's truck that has
  // since gone into maintenance can still be shown in its dropdown.
  const loadTrucks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/resources?category=truck", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load trucks");
      setTrucks(data.resources || []);
    } catch (err) {
      console.error("loadTrucks error:", err);
    }
  }, []);

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setRoutesError("");
    try {
      const res = await fetch("/api/routes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load routes");
      setRoutes(data.routes || []);
    } catch (err) {
      console.error("loadRoutes error:", err);
      setRoutesError(err.message);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadZones();
    loadTrucks();
    loadRoutes();
  }, [loadEmployees, loadZones, loadTrucks, loadRoutes]);

  const selectedZone = useMemo(
    () => zones.find((z) => z.name === form.zone) || null,
    [zones, form.zone]
  );

  // Stop choices: the zone's known stops, plus (when editing) any stops
  // already on the route that the zone no longer lists.
  const stopChoices = useMemo(() => {
    const known = selectedZone?.stops || [];
    const legacy = editing && editing.zone === form.zone
      ? editing.stops.map((s) => s.label).filter((l) => !known.includes(l))
      : [];
    return [...known, ...legacy];
  }, [selectedZone, editing, form.zone]);

  const completedLabels = useMemo(
    () => new Set(editing ? editing.stops.filter((s) => s.completed).map((s) => s.label) : []),
    [editing]
  );

  const availableTrucks = trucks.filter(
    (t) => t.status === "active" || (editing && String(editing.vehicle?._id) === t._id)
  );

  function handleZoneChange(zoneName) {
    // Switching zones invalidates any already-picked stops.
    setForm((f) => ({ ...f, zone: zoneName, stops: [""] }));
  }

  function handleLeadChange(id) {
    // The lead can't also be listed as crew.
    setForm((f) => ({ ...f, assignedTo: id, crew: f.crew.filter((c) => c !== id) }));
  }

  function toggleCrew(id) {
    setForm((f) => ({
      ...f,
      crew: f.crew.includes(id) ? f.crew.filter((c) => c !== id) : [...f.crew, id],
    }));
  }

  function updateStop(index, value) {
    setForm((f) => {
      const stops = [...f.stops];
      stops[index] = value;
      return { ...f, stops };
    });
  }

  function moveStop(index, delta) {
    setForm((f) => {
      const target = index + delta;
      if (target < 0 || target >= f.stops.length) return f;
      const stops = [...f.stops];
      [stops[index], stops[target]] = [stops[target], stops[index]];
      return { ...f, stops };
    });
  }

  function addStopRow() {
    setForm((f) => ({ ...f, stops: [...f.stops, ""] }));
  }

  function removeStopRow(index) {
    setForm((f) => {
      if (f.stops.length === 1) return f;
      return { ...f, stops: f.stops.filter((_, i) => i !== index) };
    });
  }

  function startEdit(route) {
    setEditing(route);
    setFormError("");
    setFormSuccess("");
    setForm({
      zone: route.zone,
      date: new Date(route.date).toISOString().slice(0, 10),
      assignedTo: route.assignedTo?._id || "",
      crew: (route.crew || []).map((c) => c._id),
      vehicle: route.vehicle?._id || "",
      stops: route.stops.map((s) => s.label),
      reason: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const stops = form.stops.map((s) => s.trim()).filter(Boolean);
    if (!form.assignedTo) {
      setFormError("Choose the lead crew member (driver) for this route.");
      return;
    }
    if (!form.zone) {
      setFormError("Choose a zone.");
      return;
    }
    if (stops.length === 0) {
      setFormError("Select at least one stop.");
      return;
    }

    const payload = {
      zone: form.zone,
      date: form.date,
      assignedTo: form.assignedTo,
      crew: form.crew,
      vehicle: form.vehicle || null,
      stops,
    };
    if (editing && form.reason.trim()) payload.reason = form.reason.trim();

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/routes/${editing._id}` : "/api/routes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorText(data, editing ? "Could not update route" : "Could not create route"));

      const lead = employees.find((emp) => emp._id === form.assignedTo)?.name || "the crew";
      setFormSuccess(
        editing
          ? data.notified
            ? `Route updated. ${data.notified} crew member${data.notified === 1 ? "" : "s"} notified of the change.`
            : "No changes to save."
          : `Route published — ${lead} and the crew have been notified, and it's on their dashboard now.`
      );
      setEditing(null);
      setForm((f) => emptyForm({ date: f.date }));
      loadRoutes();
    } catch (err) {
      console.error("RouteBuilder submit error:", err);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(route) {
    const confirmed = window.confirm(
      `Delete the route for ${route.assignedTo?.name || "this employee"} on ${routeDateLabel(
        route.date
      )}? The crew will be told it's cancelled. This can't be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/routes/${route._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (editing?._id === route._id) cancelEdit();
      setRoutes((prev) => prev.filter((r) => r._id !== route._id));
    } catch (err) {
      console.error("handleDelete route error:", err);
      alert(err.message);
    }
  }

  const noZones = !zonesLoading && !zonesError && zones.length === 0;
  const routeStarted = Boolean(editing?.startedAt);

  return (
    <div className="mt-8 space-y-8">
      <div className="card max-w-2xl">
        <h2 className="font-display text-base font-semibold text-loop-950">
          {editing ? "Change route" : "Assign a new route"}
        </h2>
        {editing && (
          <p className="mt-1 text-sm text-loop-500">
            Editing the {editing.zone} route for {routeDateLabel(editing.date)}. Crew
            members added, removed, or kept on the route are notified when you save.
          </p>
        )}

        {employeesError && <p className="mt-2 text-sm text-red-600">{employeesError}</p>}
        {!employeesLoading && !employeesError && employees.length === 0 && (
          <p className="mt-2 text-sm text-loop-500">
            No Collection Crew accounts exist yet. Someone needs to register
            with the &ldquo;Collection Crew&rdquo; role before you can assign
            them a route.
          </p>
        )}

        {zonesError && <p className="mt-2 text-sm text-red-600">{zonesError}</p>}
        {noZones && (
          <p className="mt-2 text-sm text-loop-500">
            No zones exist yet. Set up zones and their known stops in{" "}
            <a href="/admin/zones" className="underline font-medium text-loop-700">
              Zone manager
            </a>{" "}
            before building a route.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="date">
                Route date
              </label>
              <input
                id="date"
                type="date"
                required
                className="field-input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                disabled={routeStarted}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="zone">
                Zone
              </label>
              <select
                id="zone"
                required
                className="field-input"
                value={form.zone}
                onChange={(e) => handleZoneChange(e.target.value)}
                disabled={zonesLoading || zones.length === 0 || routeStarted}
              >
                <option value="">{zonesLoading ? "Loading zones…" : "Select a zone"}</option>
                {zones.map((zone) => (
                  <option key={zone._id} value={zone.name}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {routeStarted && (
            <p className="text-xs text-loop-500">
              This route is already in progress, so its date and zone are locked.
            </p>
          )}

          {/* --- CPT-39 Team & vehicle allocation ------------------------ */}
          <fieldset className="rounded-[3px] border border-loop-200 p-4">
            <legend className="px-1 text-sm font-semibold text-loop-900">Team &amp; vehicle</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="assignedTo">
                  Lead / driver
                </label>
                <select
                  id="assignedTo"
                  required
                  className="field-input"
                  value={form.assignedTo}
                  onChange={(e) => handleLeadChange(e.target.value)}
                  disabled={employeesLoading || employees.length === 0}
                >
                  <option value="">
                    {employeesLoading ? "Loading crew…" : "Select a crew member"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="vehicle">
                  Truck
                </label>
                <select
                  id="vehicle"
                  className="field-input"
                  value={form.vehicle}
                  onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
                >
                  <option value="">No truck allocated</option>
                  {availableTrucks.map((t) => (
                    <option key={t._id} value={t._id}>
                      {truckLabel(t)}
                      {t.status !== "active" ? ` — ${t.status.replace("_", " ")}` : ""}
                    </option>
                  ))}
                </select>
                {trucks.length === 0 && (
                  <p className="mt-1 text-xs text-loop-500">
                    No trucks yet. Add one (category &ldquo;Truck&rdquo;) in{" "}
                    <a href="/admin/resources" className="underline">Resource manager</a>.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <span className="field-label">Crew on board</span>
              {employees.filter((emp) => emp._id !== form.assignedTo).length === 0 ? (
                <p className="text-xs text-loop-500">No other crew members available.</p>
              ) : (
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {employees
                    .filter((emp) => emp._id !== form.assignedTo)
                    .map((emp) => (
                      <label key={emp._id} className="flex items-center gap-2 text-sm text-loop-900">
                        <input
                          type="checkbox"
                          checked={form.crew.includes(emp._id)}
                          onChange={() => toggleCrew(emp._id)}
                        />
                        {emp.name}
                      </label>
                    ))}
                </div>
              )}
              <p className="mt-2 text-xs text-loop-500">
                People and trucks can&rsquo;t be booked onto two routes on the same day.
              </p>
            </div>
          </fieldset>

          <div>
            <span className="field-label">Stops, in order</span>

            {form.zone && selectedZone && stopChoices.length === 0 && (
              <p className="text-xs text-loop-500">
                This zone has no known stops yet — add some in{" "}
                <a href="/admin/zones" className="underline font-medium text-loop-700">
                  Zone manager
                </a>
                , then come back here.
              </p>
            )}

            {selectedZone && stopChoices.length > 0 && (
              <div className="space-y-2">
                {form.stops.map((stop, index) => {
                  // A stop already picked in a DIFFERENT row shouldn't
                  // also be selectable here.
                  const takenElsewhere = form.stops.filter((s, i) => i !== index && s);
                  const options = stopChoices.filter(
                    (s) => s === stop || !takenElsewhere.includes(s)
                  );
                  const done = completedLabels.has(stop);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-6 shrink-0 font-mono text-xs text-loop-400">
                        {index + 1}.
                      </span>
                      <select
                        className="field-input"
                        value={stop}
                        onChange={(e) => updateStop(index, e.target.value)}
                        disabled={done}
                        aria-label={`Stop ${index + 1}`}
                      >
                        <option value="">Select a stop</option>
                        {options.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {done && <span className="badge shrink-0 bg-loop-700/15 text-loop-700">Done</span>}
                      <button
                        type="button"
                        onClick={() => moveStop(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move stop ${index + 1} up`}
                        className="shrink-0 px-1 text-sm text-loop-700 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStop(index, 1)}
                        disabled={index === form.stops.length - 1}
                        aria-label={`Move stop ${index + 1} down`}
                        className="shrink-0 px-1 text-sm text-loop-700 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStopRow(index)}
                        disabled={form.stops.length === 1 || done}
                        className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-30"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedZone && stopChoices.length > 0 && (
              <button
                type="button"
                onClick={addStopRow}
                disabled={form.stops.length >= stopChoices.length}
                className="btn-secondary mt-2 py-1.5 px-3 text-xs disabled:opacity-40"
              >
                + Add stop
              </button>
            )}
          </div>

          {editing && (
            <div>
              <label className="field-label" htmlFor="reason">
                Reason for change <span className="text-loop-400">(optional, shared with the crew)</span>
              </label>
              <input
                id="reason"
                maxLength={200}
                className="field-input"
                placeholder="e.g. Truck WP-4021 in for repairs"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
          )}

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {formSuccess && <p className="text-sm text-loop-700">{formSuccess}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || employeesLoading || employees.length === 0 || noZones}
              className="btn-primary disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Publish route"}
            </button>
            {editing && (
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          All assigned routes
        </h2>

        {routesLoading && <p className="card text-sm text-loop-500">Loading routes…</p>}
        {!routesLoading && routesError && (
          <p className="card text-sm text-red-600">{routesError}</p>
        )}
        {!routesLoading && !routesError && routes.length === 0 && (
          <p className="card text-sm text-loop-700">No routes have been assigned yet.</p>
        )}

        {!routesLoading && !routesError && routes.length > 0 && (
          <div className="space-y-3">
            {routes.map((route) => {
              const completed = route.stops.filter((s) => s.completed).length;
              const total = route.stops.length;
              const crewNames = (route.crew || []).map((c) => c.name).join(", ");
              const log = route.changeLog || [];
              return (
                <div key={route._id} className={`card ${editing?._id === route._id ? "ring-2 ring-amber-500" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-loop-900">
                        {route.zone}{" "}
                        <span className="font-normal text-loop-500">
                          &middot; {routeDateLabel(route.date)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-loop-500">
                        Lead: {route.assignedTo?.name || "Unknown crew member"}
                        {crewNames && <> &middot; Crew: {crewNames}</>}
                      </p>
                      <p className="mt-0.5 text-xs text-loop-500">
                        Truck: {route.vehicle ? truckLabel(route.vehicle) : "not allocated"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge bg-loop-100 text-loop-700">
                        {route.completedAt ? "Completed" : `${completed}/${total} complete`}
                      </span>
                      {!route.completedAt && (
                        <button
                          type="button"
                          onClick={() => startEdit(route)}
                          className="text-xs font-semibold text-loop-700 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(route)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {log.length > 0 && (
                    <div className="mt-3 border-t border-loop-100 pt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedLog(expandedLog === route._id ? null : route._id)}
                        className="text-xs font-semibold text-loop-700 hover:underline"
                      >
                        {expandedLog === route._id ? "Hide" : "Show"} change history ({log.length})
                      </button>
                      {expandedLog === route._id && (
                        <ul className="mt-2 space-y-1">
                          {[...log].reverse().map((entry, i) => (
                            <li key={i} className="text-xs text-loop-500">
                              <span className="font-mono">
                                {new Date(entry.at).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>{" "}
                              — {entry.summary}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
