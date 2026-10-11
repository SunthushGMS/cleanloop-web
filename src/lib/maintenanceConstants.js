// Shared by the model, validator and UI. No server-only imports here.

export const TYPE_OPTIONS = [
  { value: "breakdown", label: "Breakdown" },
  { value: "preventive", label: "Preventive maintenance" },
];

export const RECORD_STATUS_VALUES = [
  "reported",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

export const OPEN_STATUSES = ["reported", "scheduled", "in_progress"];
export const CLOSED_STATUSES = ["completed", "cancelled"];

export const TYPE_VALUES = TYPE_OPTIONS.map((o) => o.value);
export const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function recordStatusLabel(type, status) {
  if (status === "in_progress") return type === "breakdown" ? "Under repair" : "In progress";
  return (
    { reported: "Reported", scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled" }[
      status
    ] || status
  );
}