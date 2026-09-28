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
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesText, setNotesText] = useState("");

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

  async function loadEmployees() {
    try {
      const res = await fetch("/api/admin/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (e) {
      console.error("Failed to load employees", e);
    }
  }

  useEffect(() => {
    loadComplaints();
    loadEmployees();
  }, []);

  async function updateComplaint(id, updates) {
    await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setEditingNotesId(null);
    setNotesText("");
    loadComplaints();
  }

  function autoAssignByZone(c) {
    if (!employees || employees.length === 0) return;
    const cZone = (c.zone || "").toLowerCase().trim();
    // Try to match employee whose assigned zone matches or is contained in complaint zone
    let match = employees.find(
      (emp) => emp.zone && (cZone.includes(emp.zone.toLowerCase().trim()) || emp.zone.toLowerCase().trim().includes(cZone))
    );
    if (!match) match = employees[0]; // fallback to first employee
    if (match) {
      updateComplaint(c._id, { assignedTo: match._id });
    }
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

  // --- SLA & Analytics Calculations ---
  const openCount = complaints.filter((c) => c.status === "open").length;
  const inProgressCount = complaints.filter((c) => c.status === "in_progress").length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;

  const now = Date.now();
  const overdueCount = complaints.filter(
    (c) => c.status !== "resolved" && now - new Date(c.createdAt).getTime() > 48 * 3600 * 1000
  ).length;

  const resolvedWithTime = complaints.filter((c) => c.status === "resolved" && c.resolvedAt);
  const avgResolutionHours =
    resolvedWithTime.length > 0
      ? (
          resolvedWithTime.reduce((acc, c) => {
            const durationMs = new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime();
            return acc + durationMs / (1000 * 60 * 60);
          }, 0) / resolvedWithTime.length
        ).toFixed(1)
      : null;

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const descMatch = c.description?.toLowerCase().includes(q);
      const zoneMatch = c.zone?.toLowerCase().includes(q);
      const reporterMatch = c.reportedBy?.name?.toLowerCase().includes(q);
      const assigneeMatch = c.assignedTo?.name?.toLowerCase().includes(q);
      const notesMatch = c.resolutionNotes?.toLowerCase().includes(q);
      if (!descMatch && !zoneMatch && !reporterMatch && !assigneeMatch && !notesMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* --- Quick links --- */}
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

      {/* --- Complaint Queue & SLA Metrics --- */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-loop-950">
            Complaint Operations Hub
          </h2>
          <p className="text-xs text-loop-500">
            Monitor resolution performance, auto-assign ward technicians, and issue feedback.
          </p>
        </div>

        {/* SLA & Performance Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 text-center border-l-4 border-amber-500">
            <p className="text-xs font-semibold text-loop-500 uppercase tracking-wider">Open</p>
            <p className="text-2xl font-display font-bold text-amber-600">{openCount}</p>
            <p className="text-[11px] text-loop-400">{inProgressCount} in progress</p>
          </div>

          <div className="card p-3 text-center border-l-4 border-blue-500">
            <p className="text-xs font-semibold text-loop-500 uppercase tracking-wider">Resolved</p>
            <p className="text-2xl font-display font-bold text-loop-700">{resolvedCount}</p>
            <p className="text-[11px] text-loop-400">Total completed</p>
          </div>

          <div className="card p-3 text-center border-l-4 border-red-500">
            <p className="text-xs font-semibold text-loop-500 uppercase tracking-wider">SLA Breach (&gt;48h)</p>
            <p className={`text-2xl font-display font-bold ${overdueCount > 0 ? "text-red-600" : "text-loop-700"}`}>
              {overdueCount}
            </p>
            <p className="text-[11px] text-loop-400">Overdue tickets</p>
          </div>

          <div className="card p-3 text-center border-l-4 border-loop-700">
            <p className="text-xs font-semibold text-loop-500 uppercase tracking-wider">Avg Resolution</p>
            <p className="text-2xl font-display font-bold text-loop-950">
              {avgResolutionHours ? `${avgResolutionHours}h` : "N/A"}
            </p>
            <p className="text-[11px] text-loop-400">Mean time to resolve</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search complaints by keyword, zone, reporter, worker, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field-input text-xs py-2"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="field-input text-xs py-2 w-32"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="field-input text-xs py-2 w-36"
            >
              <option value="all">All Types</option>
              <option value="missed_collection">Missed collection</option>
              <option value="illegal_dumping">Illegal dumping</option>
              <option value="hazard">Hazard</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Complaints list */}
        <div className="space-y-3">
          {filteredComplaints.map((c) => {
            const isOverdue = c.status !== "resolved" && now - new Date(c.createdAt).getTime() > 48 * 3600 * 1000;
            return (
              <div key={c._id} className={`card space-y-3 ${isOverdue ? "border-red-300 bg-red-50/20" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-loop-900">
                        {TYPE_LABELS[c.type] || c.type}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-loop-100 text-loop-700 capitalize">
                        {c.source} report
                      </span>
                      {c.zone && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-900">
                          Zone: {c.zone}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                          ⚠️ Overdue &gt;48h
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-loop-800">{c.description}</p>

                    {c.resolutionNotes && (
                      <div className="p-2.5 rounded bg-loop-100/70 text-xs text-loop-900 border-l-2 border-loop-700 mt-2">
                        <strong>Resolution Notes:</strong> {c.resolutionNotes}
                      </div>
                    )}

                    <div className="text-xs text-loop-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <span>
                        Reported by: <strong>{c.reportedBy?.name || "Unknown"}</strong> ({c.reportedBy?.role || "user"})
                      </span>
                      <span>&middot;</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                      {c.resolvedAt && (
                        <>
                          <span>&middot;</span>
                          <span className="text-loop-700">
                            Resolved: {new Date(c.resolvedAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={c.status} />
                </div>

                {/* Resolution Notes Modal / Edit box */}
                {editingNotesId === c._id && (
                  <div className="p-3 bg-white rounded border border-loop-300 space-y-2">
                    <label className="field-label text-xs">Add / Update Resolution Notes:</label>
                    <textarea
                      rows={2}
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="e.g. Dispatched collection truck #4. Bin cleared at 10:30 AM."
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
                        onClick={() =>
                          updateComplaint(c._id, {
                            resolutionNotes: notesText,
                            status: c.status === "open" ? "in_progress" : c.status,
                          })
                        }
                        className="btn-primary text-xs py-1 px-2.5"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-loop-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Worker Assignment + Auto-Assign */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-loop-700 whitespace-nowrap">
                      Assigned Worker:
                    </span>
                    <select
                      value={c.assignedTo?._id || ""}
                      onChange={(e) =>
                        updateComplaint(c._id, { assignedTo: e.target.value || null })
                      }
                      className="field-input text-xs py-1 px-2.5 max-w-[190px]"
                    >
                      <option value="">-- Unassigned --</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} {emp.zone ? `(${emp.zone})` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => autoAssignByZone(c)}
                      title="Automatically assign an employee matching this complaint's zone"
                      className="btn-secondary text-[11px] py-1 px-2 text-loop-700 bg-loop-100/80 hover:bg-loop-200"
                    >
                      ⚡ Auto-Assign
                    </button>
                  </div>

                  {/* Status & Notes Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        setEditingNotesId(c._id);
                        setNotesText(c.resolutionNotes || "");
                      }}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      💬 Note
                    </button>

                    {["open", "in_progress", "resolved"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateComplaint(c._id, { status: s })}
                        disabled={c.status === s}
                        className="btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
                      >
                        {s === "open" ? "Open" : s === "in_progress" ? "In Progress" : "Resolve"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredComplaints.length === 0 && (
            <p className="card text-sm text-loop-700 text-center py-8">
              No complaints match the selected filters.
            </p>
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