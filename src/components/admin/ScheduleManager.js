"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DAYS, WASTE_LABELS, WASTE_TYPES, formatTimeWindow } from "@/lib/schedule";

function emptyForm() {
  return {
    zone: "",
    dayOfWeek: "Monday",
    wasteType: "general",
    startTime: "",
    endTime: "",
    notes: "",
  };
}

function errorText(data, fallback) {
  const detailMsg = data?.details ? Object.values(data.details).flat().join(" ") : "";
  return (data?.error || fallback) + (detailMsg ? ` ${detailMsg}` : "");
}

function notifiedText(n) {
  return n > 0 ? ` ${n} resident${n === 1 ? "" : "s"} notified.` : "";
}

const isLive = (s) => (s.status || "published") === "published";

/**
 * ScheduleManager (CPT-38 Schedule Creation & Publishing)
 * ---------------------------------------------------------------------
 * Create schedules as drafts or publish them straight away, then edit,
 * publish/unpublish, or delete them. Every change to a schedule residents
 * can see triggers a notification server-side (CPT-40); the API reports
 * how many residents were told, which is surfaced in the success message.
 */
export default function ScheduleManager() {
  const [zones, setZones] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [zoneRes, scheduleRes] = await Promise.all([
        fetch("/api/zones", { cache: "no-store" }),
        fetch("/api/schedules", { cache: "no-store" }),
      ]);
      const [zoneData, scheduleData] = await Promise.all([zoneRes.json(), scheduleRes.json()]);
      if (!zoneRes.ok) throw new Error(zoneData.error || "Could not load zones");
      if (!scheduleRes.ok) throw new Error(scheduleData.error || "Could not load schedules");
      setZones(zoneData.zones || []);
      setSchedules(scheduleData.schedules || []);
    } catch (err) {
      console.error("ScheduleManager load error:", err);
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group by zone for display; zones with no schedules still appear when
  // unfiltered, so gaps in coverage are obvious.
  const grouped = useMemo(() => {
    const names = zoneFilter
      ? [zoneFilter]
      : [...new Set([...zones.map((z) => z.name), ...schedules.map((s) => s.zone)])].sort();
    return names.map((name) => ({
      zone: name,
      items: schedules.filter((s) => s.zone === name),
    }));
  }, [zones, schedules, zoneFilter]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(schedule) {
    setEditingId(schedule._id);
    setForm({
      zone: schedule.zone,
      dayOfWeek: schedule.dayOfWeek,
      wasteType: schedule.wasteType || "general",
      startTime: schedule.startTime || "",
      endTime: schedule.endTime || "",
      notes: schedule.notes || "",
    });
    setFormError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
  }

  async function handleSubmit(publish) {
    setFormError("");
    setMessage("");
    if (!form.zone) {
      setFormError("Choose a zone.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/schedules/${editingId}` : "/api/schedules", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // On edit, the status is left alone — publishing/unpublishing is
        // its own explicit action on the list row.
        body: JSON.stringify(editingId ? form : { ...form, publish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorText(data, "Could not save schedule"));

      setMessage(
        (editingId
          ? "Schedule updated."
          : publish
          ? "Schedule published."
          : "Draft saved. Publish it when you're ready.") + notifiedText(data.notified)
      );
      setEditingId(null);
      setForm((f) => ({ ...emptyForm(), zone: f.zone }));
      load();
    } catch (err) {
      console.error("ScheduleManager save error:", err);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(schedule, status) {
    setMessage("");
    try {
      const res = await fetch(`/api/schedules/${schedule._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorText(data, "Could not update schedule"));
      setMessage(
        (status === "published" ? "Schedule published." : "Schedule moved back to draft.") +
          notifiedText(data.notified)
      );
      load();
    } catch (err) {
      console.error("ScheduleManager setStatus error:", err);
      alert(err.message);
    }
  }

  async function handleDelete(schedule) {
    const live = isLive(schedule);
    const confirmed = window.confirm(
      `Delete the ${schedule.wasteType} collection on ${schedule.dayOfWeek} for ${schedule.zone}?${
        live ? " Residents in this zone will be notified it's cancelled." : ""
      }`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/schedules/${schedule._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (editingId === schedule._id) cancelEdit();
      setMessage("Schedule deleted." + notifiedText(data.notified));
      setSchedules((prev) => prev.filter((s) => s._id !== schedule._id));
    } catch (err) {
      console.error("ScheduleManager delete error:", err);
      alert(err.message);
    }
  }

  const noZones = !loading && !loadError && zones.length === 0;

  return (
    <div className="mt-8 space-y-8">
      <div className="card max-w-2xl">
        <h2 className="font-display text-base font-semibold text-loop-950">
          {editingId ? "Edit schedule" : "Create a collection schedule"}
        </h2>
        {editingId && (
          <p className="mt-1 text-sm text-loop-500">
            If this schedule is published, residents in the zone are notified of the change.
          </p>
        )}

        {noZones && (
          <p className="mt-2 text-sm text-loop-500">
            No zones exist yet. Add one in{" "}
            <a href="/admin/zones" className="font-medium text-loop-700 underline">
              Zone manager
            </a>{" "}
            first.
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(true);
          }}
          className="mt-4 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="sched-zone">
                Zone / ward
              </label>
              <select
                id="sched-zone"
                required
                className="field-input"
                value={form.zone}
                onChange={update("zone")}
                disabled={loading || zones.length === 0}
              >
                <option value="">{loading ? "Loading zones…" : "Select a zone"}</option>
                {zones.map((z) => (
                  <option key={z._id} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="sched-day">
                Collection day
              </label>
              <select id="sched-day" className="field-input" value={form.dayOfWeek} onChange={update("dayOfWeek")}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="sched-waste">
                Waste type
              </label>
              <select id="sched-waste" className="field-input" value={form.wasteType} onChange={update("wasteType")}>
                {WASTE_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {WASTE_LABELS[w]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="sched-start">
                Window start <span className="text-loop-400">(optional)</span>
              </label>
              <input id="sched-start" type="time" className="field-input" value={form.startTime} onChange={update("startTime")} />
            </div>
            <div>
              <label className="field-label" htmlFor="sched-end">
                Window end <span className="text-loop-400">(optional)</span>
              </label>
              <input id="sched-end" type="time" className="field-input" value={form.endTime} onChange={update("endTime")} />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="sched-notes">
              Note for residents <span className="text-loop-400">(optional)</span>
            </label>
            <input
              id="sched-notes"
              maxLength={300}
              className="field-input"
              placeholder="e.g. Bins out by 7am, lids closed"
              value={form.notes}
              onChange={update("notes")}
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex flex-wrap gap-3">
            {editingId ? (
              <>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="submit" disabled={saving || noZones} className="btn-primary disabled:opacity-60">
                  {saving ? "Saving…" : "Publish now"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={saving || noZones}
                  className="btn-secondary disabled:opacity-60"
                >
                  Save as draft
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {message && (
        <p className="rounded-[3px] bg-loop-700/10 px-4 py-3 text-sm text-loop-700">{message}</p>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-loop-950">All schedules</h2>
          <select
            aria-label="Filter by zone"
            className="field-input w-auto"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z._id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="card text-sm text-loop-500">Loading schedules…</p>}
        {!loading && loadError && (
          <div className="card">
            <p className="text-sm text-red-600">{loadError}</p>
            <button type="button" onClick={load} className="btn-secondary mt-3 py-1.5 px-3 text-xs">
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <div className="space-y-4">
            {grouped.map(({ zone, items }) => (
              <div key={zone} className="card">
                <p className="text-sm font-semibold text-loop-900">{zone}</p>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-loop-500">No schedules for this zone yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-loop-100">
                    {items.map((s) => {
                      const live = isLive(s);
                      const window = formatTimeWindow(s);
                      return (
                        <li key={s._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-loop-900">
                              {s.dayOfWeek}
                              <span className="font-normal text-loop-500">
                                {" "}
                                &middot; {WASTE_LABELS[s.wasteType] || s.wasteType}
                                {window && <> &middot; {window}</>}
                              </span>
                            </p>
                            {s.notes && <p className="mt-0.5 text-xs text-loop-500">{s.notes}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`badge ${
                                live ? "bg-loop-700/15 text-loop-700" : "bg-amber-500/20 text-amber-600"
                              }`}
                            >
                              {live ? "Published" : "Draft"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setStatus(s, live ? "draft" : "published")}
                              className="text-xs font-semibold text-loop-700 hover:underline"
                            >
                              {live ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(s)}
                              className="text-xs font-semibold text-loop-700 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(s)}
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="card text-sm text-loop-700">No schedules yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
