"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/layout/PageHeader";

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
      <PageHeader
        title="My reports"
        description="Every issue you have reported, and where it stands."
      />
      <div className="space-y-3">
        {complaints.map((c) => (
          <div key={c._id} className="card flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-loop-900">{TYPE_LABELS[c.type]}</p>
              <p className="text-sm text-loop-700">{c.description}</p>
              <p className="mt-1 text-xs text-loop-500">
                {new Date(c.createdAt).toLocaleDateString()}
              </p>
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
