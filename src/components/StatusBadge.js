const STYLES = {
  open: "bg-clay-50 text-clay-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-brand-50 text-brand-700",
};

const LABELS = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STYLES[status] || "bg-loop-100 text-loop-700"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {LABELS[status] || status}
    </span>
  );
}
