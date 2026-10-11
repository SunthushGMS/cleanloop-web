// Shared constants for Adopt-a-Spot, used by the models, API routes and UI.

export const CHECKIN_CONDITIONS = ["clean", "needs_attention", "dumped"];

export const CONDITION_LABELS = {
  clean: "Clean",
  needs_attention: "Needs attention",
  dumped: "Dumped",
};

export const REQUEST_STATUSES = ["pending", "approved", "merged", "rejected", "withdrawn"];

// An adopted spot with no check-in for this long is flagged as stale.
export const STALE_AFTER_DAYS = 14;

// Most pending requests one volunteer can have at a time (protects the admin queue).
export const MAX_PENDING_REQUESTS = 5;

// Photo limits, enforced on the server (the browser also resizes before upload).
export const MAX_PHOTO_BYTES = 400 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The app serves Sri Lankan wards, so "one check-in per day" uses local days.
export const APP_TIME_ZONE = "Asia/Colombo";

/** "Ward 4", " ward  4 " -> "ward 4": used to match spots in the same zone. */
export function normalizeZone(zone) {
  return String(zone || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Calendar day ("YYYY-MM-DD") of a moment in APP_TIME_ZONE. */
export function localDayKey(date = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(date);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derived state of a spot, shared by the API and the UI:
 * - adopted: has a volunteer.
 * - stale: adopted, but no check-in for STALE_AFTER_DAYS (counted from
 *   adoption if never checked). A quietly abandoned spot looks "covered",
 *   which is worse than no volunteer, so the admin needs to see it.
 * - needsAttention: the latest check-in said "dumped" or "needs attention".
 *   Clears by itself when a later check-in says "clean".
 */
export function spotHealth(spot, now = new Date()) {
  const adopted = Boolean(spot.adopter);
  // Count from the later of the last check-in and the adoption, so a new
  // adopter isn't flagged stale because of the previous adopter's old visit.
  const times = [spot.lastCheckIn?.at, spot.adoptedAt]
    .filter(Boolean)
    .map((t) => new Date(t).getTime());
  const lastSeen = times.length ? Math.max(...times) : null;
  const daysSinceCheck =
    lastSeen !== null ? Math.floor((now.getTime() - lastSeen) / DAY_MS) : null;
  return {
    adopted,
    stale: adopted && daysSinceCheck !== null && daysSinceCheck >= STALE_AFTER_DAYS,
    daysSinceCheck,
    needsAttention: ["dumped", "needs_attention"].includes(spot.lastCheckIn?.condition),
  };
}
