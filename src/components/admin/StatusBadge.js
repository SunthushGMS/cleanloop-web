import { STATUS_LABEL } from "@/lib/resourceConstants";

// Re-exported because ResourceStats.js used to import it from here.
export { STATUS_LABEL };

const STATUS_STYLE = {
  active: "bg-brand-50 text-brand-700",
  in_use: "bg-blue-50 text-blue-700",
  maintenance: "bg-amber-50 text-amber-700",
  breakdown: "bg-red-50 text-red-600",
  retired: "bg-loop-100 text-loop-500",
  out_of_stock: "bg-clay-50 text-clay-700",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLE[status] || "bg-loop-100 text-loop-500"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}