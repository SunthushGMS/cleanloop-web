// Campaign dates come from an <input type="date"> as "YYYY-MM-DD" and are
// stored as UTC midnight of that calendar day. The server can't know the
// user's time zone, so "today" is taken as the earliest calendar date
// currently in effect anywhere (UTC-12). That way a user in any time zone
// can still pick their own today, and a campaign only counts as past once
// its day is over everywhere.
const UTC_MINUS_12_MS = 12 * 60 * 60 * 1000;

/** UTC midnight of the earliest calendar date in effect anywhere right now. */
export function earliestTodayUTC() {
  const d = new Date(Date.now() - UTC_MINUS_12_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** True once the campaign's day has ended in every time zone. */
export function isPastCampaignDate(date) {
  return new Date(date) < earliestTodayUTC();
}

const UTC_PLUS_14_MS = 14 * 60 * 60 * 1000;

/**
 * True once the campaign's day has started somewhere (UTC+14, the latest
 * calendar date anywhere). Used for recording outcomes, so an organizer can
 * log results on the day itself instead of waiting for it to end everywhere.
 */
export function hasCampaignDayStarted(date) {
  const d = new Date(Date.now() + UTC_PLUS_14_MS);
  const latestToday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return new Date(date) <= latestToday;
}
