import { STATUS_LABEL } from "@/lib/resourceConstants";

// Re-exported because ResourceStats.js used to import it from here.
export { STATUS_LABEL };

const STATUS_STYLE = {
  active: "bg-loop-700/15 text-loop-700",
  in_use: "bg-blue-50 text-blue-700",
  maintenance: "bg-amber-500/15 text-amber-600",
  breakdown: "bg-red-50 text-red-600",
  retired: "bg-loop-100 text-loop-500",
  out_of_stock: "bg-clay-500/15 text-clay-600",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLE[status] || "bg-loop-100 text-loop-500"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}