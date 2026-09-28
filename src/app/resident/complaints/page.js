"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";

const TYPE_LABELS = {
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  hazard: "Hazard",
  other: "Other",
};

export default function ResidentComplaintsPage() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    fetch("/api/complaints")
      .then((r) => r.json())
      .then((data) => setComplaints(data.complaints || []));
  }, []);

  return (
    <div>
      <h2 className="font-display text-base font-semibold text-loop-950 mb-3">
        All your reports
      </h2>
      <div className="space-y-3">
        {complaints.map((c) => (
          <div key={c._id} className="card flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-loop-900">
                  {TYPE_LABELS[c.type] || c.type}
                </p>
                {c.zone && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-900">
                    Zone: {c.zone}
                  </span>
                )}
              </div>
              <p className="text-sm text-loop-700 mt-1">{c.description}</p>

              {c.resolutionNotes && (
                <div className="p-2.5 rounded bg-loop-100/70 text-xs text-loop-900 border-l-2 border-loop-700 mt-2">
                  <strong>Resolution Feedback:</strong> {c.resolutionNotes}
                </div>
              )}

              <div className="mt-1.5 text-xs text-loop-500 flex items-center gap-2">
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                {c.assignedTo?.name && (
                  <>
                    <span>&middot;</span>
                    <span className="text-loop-700">Assigned worker: <strong>{c.assignedTo.name}</strong></span>
                  </>
                )}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </div>
        ))}
        {complaints.length === 0 && (
          <p className="card text-sm text-loop-700">No reports submitted yet.</p>
        )}
      </div>
    </div>
  );
}
