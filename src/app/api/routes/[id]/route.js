import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Route from "@/lib/models/Route";
import Resource from "@/lib/models/Resource";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import {
  ROUTE_POPULATE,
  formatRouteDate,
  markRouteCompleted,
  markRouteStarted,
  memberQuery,
  notifyCrew,
  routeMemberIds,
  todayBounds,
  validateAllocation,
} from "@/lib/routes";

const ObjectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

// Crew actions: complete one stop, or explicitly start the route.
const CrewActionSchema = z.union([
  z.object({ stopId: z.string().min(1) }),
  z.object({ action: z.literal("start") }),
]);

// CPT-44 Route Change Management: admin may change any of these.
const AdminEditSchema = z
  .object({
    zone: z.string().trim().min(1).max(80).optional(),
    date: z.coerce.date().optional(),
    assignedTo: ObjectId.optional(),
    crew: z.array(ObjectId).max(10).optional(),
    vehicle: ObjectId.nullable().optional(),
    stops: z.array(z.string().trim().min(1)).min(1).optional(),
    // Optional reason, passed on to the crew in their notification.
    reason: z.string().trim().max(200).optional(),
  })
  .refine((d) => Object.keys(d).some((k) => k !== "reason"), { message: "Nothing to update" });

const sameIds = (a, b) =>
  a.length === b.length && a.map(String).sort().join() === b.map(String).sort().join();

async function namesById(ids) {
  if (ids.length === 0) return {};
  const users = await User.find({ _id: { $in: ids } }).select("name").lean();
  return Object.fromEntries(users.map((u) => [String(u._id), u.name]));
}

/**
 * PATCH /api/routes/:id
 *  - employee (lead or crew): { stopId } marks a stop complete;
 *    { action: "start" } starts the route. Either one can trigger the
 *    residents' truck alerts (CPT-37).
 *  - admin: edits the route (CPT-44) and notifies affected crew.
 */
export async function PATCH(request, { params }) {
  const session = requireUser(["employee", "admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await dbConnect();

  try {
    return session.role === "admin"
      ? await adminEdit(session, params.id, body)
      : await crewAction(session, params.id, body);
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid route id" }, { status: 400 });
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/routes/:id error:", err);
    return NextResponse.json({ error: "Could not update route" }, { status: 500 });
  }
}

async function crewAction(session, routeId, body) {
  const parsed = CrewActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const route = await Route.findOne({ _id: routeId, ...memberQuery(session.sub) });
  if (!route) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Same "today" window as GET /api/routes/today. Stops on another day's
  // route can't be ticked off — that would send residents a truck alert
  // for a collection that isn't happening.
  const { start, end } = todayBounds();
  if (route.date < start || route.date >= end) {
    return NextResponse.json(
      { error: "Only today's route can be updated from the field app" },
      { status: 409 }
    );
  }

  let residentsNotified = 0;

  if ("stopId" in parsed.data) {
    const stop = route.stops.id(parsed.data.stopId);
    if (!stop) {
      return NextResponse.json({ error: "Stop not found" }, { status: 404 });
    }
    stop.completed = true;
    stop.completedAt = stop.completedAt || new Date();
    await route.save();
  }

  // Completing a stop on an un-started route implicitly starts it, so the
  // truck alert still goes out if the crew skips the Start button.
  residentsNotified += await markRouteStarted(route);
  residentsNotified += await markRouteCompleted(route);

  const populated = await Route.findById(route._id).populate(ROUTE_POPULATE).lean();
  return NextResponse.json({ route: populated, residentsNotified });
}

async function adminEdit(session, routeId, body) {
  const parsed = AdminEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { reason, ...changes } = parsed.data;

  const route = await Route.findById(routeId);
  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }
  if (route.completedAt) {
    return NextResponse.json(
      { error: "This route is already completed and can no longer be changed" },
      { status: 409 }
    );
  }

  const before = {
    zone: route.zone,
    date: route.date,
    assignedTo: String(route.assignedTo),
    crew: route.crew.map(String),
    vehicle: route.vehicle ? String(route.vehicle) : null,
    stops: route.stops.map((s) => s.label),
  };
  const after = { ...before, ...changes };

  // Once the crew is out on the road, moving the route to another zone or
  // day makes no sense — only stops, crew, and truck can still change.
  if (route.startedAt && (after.zone !== before.zone || +new Date(after.date) !== +before.date)) {
    return NextResponse.json(
      { error: "This route is in progress — its zone and date can't change now" },
      { status: 409 }
    );
  }

  const allocationError = await validateAllocation(after, {
    excludeId: route._id,
    existingStops: before.stops,
    // Only a newly chosen truck has to be active; one already on the
    // route that has since gone into maintenance shouldn't block edits.
    checkVehicleStatus: after.vehicle !== before.vehicle,
  });
  if (allocationError) {
    return NextResponse.json({ error: allocationError }, { status: 400 });
  }

  // --- Build a human summary of what changed -----------------------------
  const allIds = [...new Set([before.assignedTo, after.assignedTo, ...before.crew, ...after.crew])];
  const names = await namesById(allIds);
  const summary = [];

  if (after.zone !== before.zone) summary.push(`zone ${before.zone} → ${after.zone}`);
  if (+new Date(after.date) !== +before.date) {
    summary.push(`date ${formatRouteDate(before.date)} → ${formatRouteDate(after.date)}`);
  }
  if (after.assignedTo !== before.assignedTo) {
    summary.push(`lead ${names[before.assignedTo]} → ${names[after.assignedTo]}`);
  }
  if (!sameIds(after.crew, before.crew)) {
    const crewNames = after.crew.map((id) => names[id]).join(", ");
    summary.push(`crew now ${crewNames || "none"}`);
  }
  if (after.vehicle !== before.vehicle) {
    const truck = after.vehicle ? await Resource.findById(after.vehicle).select("name").lean() : null;
    summary.push(`truck ${truck ? `now ${truck.name}` : "removed"}`);
  }
  if (after.stops.join("|") !== before.stops.join("|")) {
    const added = after.stops.filter((s) => !before.stops.includes(s));
    const removed = before.stops.filter((s) => !after.stops.includes(s));
    if (added.length) summary.push(`added stop${added.length > 1 ? "s" : ""} ${added.join(", ")}`);
    if (removed.length) summary.push(`removed stop${removed.length > 1 ? "s" : ""} ${removed.join(", ")}`);
    if (!added.length && !removed.length) summary.push("stop order changed");
  }

  if (summary.length === 0) {
    const populated = await Route.findById(route._id).populate(ROUTE_POPULATE).lean();
    return NextResponse.json({ route: populated, notified: 0 });
  }

  // --- Apply ------------------------------------------------------------
  // Stops are matched by label so already-completed stops keep their
  // completion when the list is reordered or extended.
  if (changes.stops) {
    const existing = new Map(route.stops.map((s) => [s.label, s]));
    route.stops = after.stops.map((label) => {
      const prev = existing.get(label);
      return prev
        ? { _id: prev._id, label, completed: prev.completed, completedAt: prev.completedAt }
        : { label };
    });
  }
  route.zone = after.zone;
  route.date = after.date;
  route.assignedTo = after.assignedTo;
  route.crew = after.crew;
  route.vehicle = after.vehicle;
  route.changeLog.push({ by: session.sub, summary: summary.join("; ") });
  await route.save();

  // A stop removal can leave every remaining stop complete.
  if (route.startedAt) await markRouteCompleted(route);

  // --- Notify crew -------------------------------------------------------
  const beforeIds = [before.assignedTo, ...before.crew];
  const afterIds = routeMemberIds(route);
  const removed = beforeIds.filter((id) => !afterIds.includes(id));
  const added = afterIds.filter((id) => !beforeIds.includes(id));
  const kept = afterIds.filter((id) => beforeIds.includes(id));
  const label = `${route.zone} on ${formatRouteDate(route.date)}`;
  const why = reason ? ` Reason: ${reason}` : "";

  const counts = await Promise.all([
    notifyCrew(removed, "route_cancelled", `Removed from route: ${before.zone} on ${formatRouteDate(before.date)}`, `Operations has reassigned this route.${why}`),
    notifyCrew(added, "route_assigned", `New route: ${label}`, `${route.stops.length} stops, starting at ${route.stops[0].label}.${why}`),
    notifyCrew(kept, "route_changed", `Route changed: ${label}`, `Changes: ${summary.join("; ")}.${why}`),
  ]);

  const populated = await Route.findById(route._id).populate(ROUTE_POPULATE).lean();
  return NextResponse.json({ route: populated, notified: counts.reduce((a, b) => a + b, 0) });
}

/**
 * DELETE /api/routes/:id — admin removes a route entirely (e.g. built for
 * the wrong crew member or the wrong date). Deliberately admin-only: an
 * employee can complete their own stops via PATCH above, but shouldn't be
 * able to make a whole route disappear from ops' records. The crew are
 * told the route is cancelled.
 */
export async function DELETE(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const route = await Route.findByIdAndDelete(params.id).lean();
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    let notified = 0;
    if (!route.completedAt) {
      notified = await notifyCrew(
        routeMemberIds(route),
        "route_cancelled",
        `Route cancelled: ${route.zone} on ${formatRouteDate(route.date)}`,
        "Operations has cancelled this route."
      );
    }
    return NextResponse.json({ success: true, notified });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid route id" }, { status: 400 });
    }
    console.error("DELETE /api/routes/:id error:", err);
    return NextResponse.json({ error: "Could not delete route" }, { status: 500 });
  }
}
