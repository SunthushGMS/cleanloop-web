import Route from "@/lib/models/Route";
import Resource from "@/lib/models/Resource";
import User from "@/lib/models/User";
import Zone from "@/lib/models/Zone";
import { notifyUsers, notifyZoneResidents } from "@/lib/notify";

/**
 * Server-side route helpers shared by /api/routes, /api/routes/:id,
 * /api/routes/today and /api/routes/progress.
 */

// Fields the crew/admin UIs need from referenced docs.
export const ROUTE_POPULATE = [
  { path: "assignedTo", select: "name email" },
  { path: "crew", select: "name email" },
  { path: "vehicle", select: "name identifier meta status" },
];

/**
 * Bounds for "today's" routes. Route dates are calendar days stored as
 * UTC midnight (the route builder sends "YYYY-MM-DD"), so today is the
 * server's LOCAL calendar date expressed the same way. Comparing local
 * midnight against UTC-midnight dates would drop routes for servers west
 * of UTC. Same caveat as before (originally inline in /api/routes/today):
 * one server timezone for everyone — fine for a single-region deployment.
 */
export function todayBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/**
 * The calendar day a route date belongs to. Dates from the route builder
 * arrive as "YYYY-MM-DD" (parsed as UTC midnight), so the day is taken in
 * UTC to avoid a date sliding into the previous/next day.
 */
export function routeDayBounds(date) {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Everyone on a route: lead + crew, as unique strings. */
export function routeMemberIds(route) {
  const ids = [route.assignedTo, ...(route.crew || [])].map((v) => String(v?._id || v));
  return [...new Set(ids.filter(Boolean))];
}

/** Query matching routes a given employee is on, as lead or crew. */
export function memberQuery(userId) {
  return { $or: [{ assignedTo: userId }, { crew: userId }] };
}

export function formatRouteDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * CPT-39 validation: the lead and crew must be real employee accounts,
 * the vehicle an active truck, the stops known stops of the zone, and
 * nobody (person or truck) may be double-booked on the same day.
 *
 * Returns an error string, or null when the allocation is valid.
 * `excludeId` skips the route being edited in the double-booking check.
 */
export async function validateAllocation(
  { zone, date, assignedTo, crew = [], vehicle = null, stops = [] },
  { excludeId = null, existingStops = [], checkVehicleStatus = true } = {}
) {
  const members = [...new Set([String(assignedTo), ...crew.map(String)])];
  if (crew.map(String).includes(String(assignedTo))) {
    return "The lead crew member is already the driver — don't add them to the crew list too.";
  }

  const zoneDoc = await Zone.findOne({ name: zone }).lean();
  if (!zoneDoc) return "Select a valid zone";
  // Stops already on a route being edited stay allowed even if the zone's
  // list has since changed — otherwise an old route could never be edited.
  const unknownStops = stops.filter(
    (s) => !zoneDoc.stops.includes(s) && !existingStops.includes(s)
  );
  if (unknownStops.length) {
    return `Not a known stop in ${zone}: ${unknownStops.join(", ")}`;
  }
  if (new Set(stops).size !== stops.length) return "A stop can only appear once on a route.";

  const employees = await User.find({ _id: { $in: members }, role: "employee" }).select("_id name").lean();
  if (employees.length !== members.length) {
    return "Every crew member must be an existing Collection Crew account";
  }

  let truck = null;
  if (vehicle) {
    truck = await Resource.findOne({ _id: vehicle, category: "truck" }).lean();
    if (!truck) return "Vehicle must be a truck from the Resource manager";
    if (checkVehicleStatus && truck.status !== "active") {
      return `${truck.name} is marked "${truck.status.replace("_", " ")}" — choose an active truck`;
    }
  }

  const { start, end } = routeDayBounds(date);
  const sameDay = { date: { $gte: start, $lt: end } };
  if (excludeId) sameDay._id = { $ne: excludeId };

  const clashing = await Route.find({
    ...sameDay,
    $or: [
      { assignedTo: { $in: members } },
      { crew: { $in: members } },
      ...(vehicle ? [{ vehicle }] : []),
    ],
  }).lean();

  for (const other of clashing) {
    if (vehicle && String(other.vehicle) === String(vehicle)) {
      return `${truck.name} is already allocated to the ${other.zone} route that day`;
    }
    const busy = routeMemberIds(other).find((id) => members.includes(id));
    if (busy) {
      const who = employees.find((e) => String(e._id) === busy)?.name || "A crew member";
      return `${who} is already on the ${other.zone} route that day`;
    }
  }

  return null;
}

/**
 * CPT-37 Truck Arrival Alerts + CPT-43: mark a route started (if it
 * isn't already) and tell the zone's residents the truck is on its way.
 * Idempotent: startedAt doubles as the "alert already sent" flag, so a
 * route only ever alerts once.
 */
export async function markRouteStarted(route) {
  if (route.startedAt) return 0;
  route.startedAt = new Date();
  await route.save();

  const first = route.stops.find((s) => !s.completed)?.label;
  return notifyZoneResidents(route.zone, {
    type: "truck_en_route",
    title: `Collection truck on its way to ${route.zone}`,
    message: `The crew has started today's route (${route.stops.length} stop${
      route.stops.length === 1 ? "" : "s"
    })${first ? `, beginning at ${first}` : ""}. Please have your bins out.`,
  });
}

/** Mark completed (once) and tell residents collection is done for today. */
export async function markRouteCompleted(route) {
  if (route.completedAt || route.stops.some((s) => !s.completed)) return 0;
  route.completedAt = new Date();
  await route.save();

  return notifyZoneResidents(route.zone, {
    type: "collection_completed",
    title: `Collection completed in ${route.zone}`,
    message: "All stops on today's route are done. Missed yours? Report it from your dashboard.",
  });
}

/** Tell crew members about route assignment changes (CPT-44). */
export async function notifyCrew(ids, type, title, message) {
  return notifyUsers(ids, { type, title, message, link: "/employee" });
}
