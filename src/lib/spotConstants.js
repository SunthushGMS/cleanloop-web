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
