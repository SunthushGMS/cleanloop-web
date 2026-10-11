/**
 * Schedule constants + pure helpers, shared by the schedule API routes
 * (server) and the admin/resident schedule UIs (client). No imports, so
 * it's safe on either side.
 */

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const WASTE_TYPES = ["general", "recycling", "organic"];

export const WASTE_LABELS = {
  general: "General waste",
  recycling: "Recycling",
  organic: "Organic",
};

/** Sort schedules Monday→Sunday, then by start time ("" sorts first). */
export function sortByWeekday(schedules) {
  return [...schedules].sort(
    (a, b) =>
      DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) ||
      (a.startTime || "").localeCompare(b.startTime || "")
  );
}

/** "07:00–10:00", "from 07:00", or "" when no window is set. */
export function formatTimeWindow({ startTime, endTime } = {}) {
  if (startTime && endTime) return `${startTime}–${endTime}`;
  if (startTime) return `from ${startTime}`;
  if (endTime) return `by ${endTime}`;
  return "";
}

/** One-line human summary used in notifications, e.g. "Recycling on Tuesday, 07:00–10:00". */
export function describeSchedule(s) {
  const window = formatTimeWindow(s);
  return `${WASTE_LABELS[s.wasteType] || s.wasteType} on ${s.dayOfWeek}${window ? `, ${window}` : ""}`;
}

/**
 * The next calendar date (local time) that falls on `dayOfWeek`, starting
 * from `from`. Today counts if the collection window hasn't ended yet.
 */
export function nextOccurrence(dayOfWeek, from = new Date(), endTime = "") {
  // JS getDay(): 0 = Sunday. DAYS is Monday-first, so shift.
  const target = (DAYS.indexOf(dayOfWeek) + 1) % 7;
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let delta = (target - date.getDay() + 7) % 7;

  if (delta === 0 && endTime) {
    const [h, m] = endTime.split(":").map(Number);
    const end = new Date(date);
    end.setHours(h, m, 0, 0);
    if (from > end) delta = 7;
  }

  date.setDate(date.getDate() + delta);
  return date;
}
