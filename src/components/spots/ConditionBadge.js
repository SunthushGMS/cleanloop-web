import { CONDITION_LABELS } from "@/lib/spotConstants";

const STYLES = {
  clean: "bg-loop-700/15 text-loop-700",
  needs_attention: "bg-amber-500/15 text-amber-600",
  dumped: "bg-clay-500/15 text-clay-600",
};

/** Badge for a check-in condition: Clean / Needs attention / Dumped. */
export default function ConditionBadge({ condition }) {
  if (!condition) return null;
  return (
    <span className={`badge ${STYLES[condition] || "bg-loop-100 text-loop-700"}`}>
      {CONDITION_LABELS[condition] || condition}
    </span>
  );
}
