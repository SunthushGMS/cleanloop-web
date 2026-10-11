import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";

/**
 * Notification producers (CPT-28). Every feature that alerts a user —
 * schedule changes (CPT-40), route changes (CPT-44), truck arrival
 * alerts (CPT-37) — goes through these helpers rather than writing
 * Notification documents itself.
 *
 * Failures are logged and swallowed: a notification is a side effect, and
 * it should never roll back or 500 the request that triggered it (e.g. a
 * schedule that was published successfully stays published).
 */

/** Create one notification per user id. Returns how many were created. */
export async function notifyUsers(userIds, { type, title, message = "", link = null }) {
  const unique = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (unique.length === 0) return 0;
  try {
    await Notification.insertMany(
      unique.map((user) => ({ user, type, title, message, link }))
    );
    return unique.length;
  } catch (err) {
    console.error("notifyUsers error:", err);
    return 0;
  }
}

/** Notify every resident registered to `zone` (exact zone-name match). */
export async function notifyZoneResidents(zone, payload) {
  if (!zone) return 0;
  try {
    const residents = await User.find({ role: "resident", zone }).select("_id").lean();
    return notifyUsers(
      residents.map((r) => r._id),
      { link: "/resident", ...payload }
    );
  } catch (err) {
    console.error("notifyZoneResidents error:", err);
    return 0;
  }
}
