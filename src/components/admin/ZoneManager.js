"use client";

import { useCallback, useEffect, useState } from "react";

function emptyCreateForm() {
  return { name: "", stops: [""] };
}

export default function ZoneManager() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Create-zone form ---------------------------------------------------
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // --- Per-zone "add a stop" inline inputs --------------------------------
  // Keyed by zone _id so typing into one zone's add-stop box doesn't leak
  // into another zone's box.
  const [newStopByZone, setNewStopByZone] = useState({});
  const [savingZoneId, setSavingZoneId] = useState(null);
  const [zoneErrors, setZoneErrors] = useState({});

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/zones", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load zones");
      setZones(data.zones || []);
    } catch (err) {
      console.error("loadZones error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // --- Create-form helpers --------------------------------------------------
  function updateCreateStop(index, value) {
    setCreateForm((f) => {
      const stops = [...f.stops];
      stops[index] = value;
      return { ...f, stops };
    });
  }

  function addCreateStopRow() {
    setCreateForm((f) => ({ ...f, stops: [...f.stops, ""] }));
  }

  function removeCreateStopRow(index) {
    setCreateForm((f) => {
      if (f.stops.length === 1) return f; // never collapse to zero rows
      return { ...f, stops: f.stops.filter((_, i) => i !== index) };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");

    const name = createForm.name.trim();
    const stops = createForm.stops.map((s) => s.trim()).filter(Boolean);

    if (!name) {
      setCreateError("Zone name is required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stops }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create zone");

      setZones((prev) =>
        [...prev, data.zone].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCreateForm(emptyCreateForm());
    } catch (err) {
      console.error("handleCreate zone error:", err);
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // --- Existing-zone stop management ----------------------------------------
  async function saveZoneStops(zone, nextStops) {
    setSavingZoneId(zone._id);
    setZoneErrors((prev) => ({ ...prev, [zone._id]: "" }));
    try {
      const res = await fetch(`/api/zones/${zone._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: nextStops }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update zone");
      setZones((prev) => prev.map((z) => (z._id === zone._id ? data.zone : z)));
    } catch (err) {
      console.error("saveZoneStops error:", err);
      setZoneErrors((prev) => ({ ...prev, [zone._id]: err.message }));
    } finally {
      setSavingZoneId(null);
    }
  }

  function addStopToZone(zone) {
    const value = (newStopByZone[zone._id] || "").trim();
    if (!value) return;
    if (zone.stops.includes(value)) {
      setZoneErrors((prev) => ({
        ...prev,
        [zone._id]: "That stop is already in this zone.",
      }));
      return;
    }
    saveZoneStops(zone, [...zone.stops, value]);
    setNewStopByZone((prev) => ({ ...prev, [zone._id]: "" }));
  }

  function removeStopFromZone(zone, stopToRemove) {
    saveZoneStops(zone, zone.stops.filter((s) => s !== stopToRemove));
  }

  async function handleDeleteZone(zone) {
    const confirmed = window.confirm(
      `Delete zone "${zone.name}"? Existing records that already reference this zone name are unaffected, but it will disappear from every dropdown.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/zones/${zone._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setZones((prev) => prev.filter((z) => z._id !== zone._id));
    } catch (err) {
      console.error("handleDeleteZone error:", err);
      alert(err.message);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* --- Create zone form ------------------------------------------- */}
      <div className="card max-w-xl">
        <h2 className="font-display text-base font-semibold text-loop-950">
          Add a new zone
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <label className="field-label" htmlFor="zone-name">
              Zone name
            </label>
            <input
              id="zone-name"
              required
              placeholder="e.g. Ward 4"
              className="field-input"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <span className="field-label">Known stops in this zone (optional)</span>
            <div className="space-y-2">
              {createForm.stops.map((stop, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 12 Lotus Lane"
                    className="field-input"
                    value={stop}
                    onChange={(e) => updateCreateStop(index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeCreateStopRow(index)}
                    disabled={createForm.stops.length === 1}
                    className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCreateStopRow}
              className="btn-secondary mt-2 py-1.5 px-3 text-xs"
            >
              + Add stop
            </button>
            <p className="mt-1.5 text-xs text-loop-500">
              You can add more stops to this zone later — this just seeds it.
            </p>
          </div>

          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <button type="submit" disabled={creating} className="btn-primary disabled:opacity-60">
            {creating ? "Creating…" : "Create zone"}
          </button>
        </form>
      </div>

      {/* --- Existing zones ----------------------------------------------- */}
      <div>
        <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
          Existing zones ({zones.length})
        </h2>

        {loading && <p className="card text-sm text-loop-500">Loading zones…</p>}
        {!loading && error && <p className="card text-sm text-red-600">{error}</p>}
        {!loading && !error && zones.length === 0 && (
          <p className="card text-sm text-loop-700">
            No zones yet — create one above. Until then, every zone dropdown
            across the app (registration, schedules, resources, routes) will
            be empty.
          </p>
        )}

        {!loading && !error && zones.length > 0 && (
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone._id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-loop-900">{zone.name}</p>
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete zone
                  </button>
                </div>

                {zone.stops.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {zone.stops.map((stop) => (
                      <li
                        key={stop}
                        className="badge inline-flex items-center gap-1.5 bg-loop-100 text-loop-700"
                      >
                        {stop}
                        <button
                          type="button"
                          onClick={() => removeStopFromZone(zone, stop)}
                          disabled={savingZoneId === zone._id}
                          className="text-loop-500 hover:text-red-600"
                          aria-label={`Remove ${stop}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {zone.stops.length === 0 && (
                  <p className="mt-3 text-xs text-loop-500">No known stops yet.</p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add a stop…"
                    className="field-input"
                    value={newStopByZone[zone._id] || ""}
                    onChange={(e) =>
                      setNewStopByZone((prev) => ({ ...prev, [zone._id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addStopToZone(zone);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addStopToZone(zone)}
                    disabled={savingZoneId === zone._id}
                    className="btn-secondary shrink-0 py-1.5 px-3 text-xs disabled:opacity-50"
                  >
                    {savingZoneId === zone._id ? "Saving…" : "Add"}
                  </button>
                </div>
                {zoneErrors[zone._id] && (
                  <p className="mt-2 text-xs text-red-600">{zoneErrors[zone._id]}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}