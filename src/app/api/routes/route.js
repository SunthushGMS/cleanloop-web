import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Route from "@/lib/models/Route";
import { requireUser } from "@/lib/requireUser";
import {
  ROUTE_POPULATE,
  formatRouteDate,
  memberQuery,
  notifyCrew,
  routeMemberIds,
  validateAllocation,
} from "@/lib/routes";

const ObjectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

const CreateRouteSchema = z.object({
  zone: z.string().trim().min(1).max(80),
  date: z.coerce.date(),
  assignedTo: ObjectId,
  // CPT-39: optional helpers and truck.
  crew: z.array(ObjectId).max(10).optional().default([]),
  vehicle: ObjectId.nullable().optional().default(null),
  stops: z.array(z.string().trim().min(1)).min(1),
});

// GET /api/routes — employee sees routes they're on (as lead or crew);
// admin sees all.
export async function GET() {
  const session = requireUser(["employee", "admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();
  const query = session.role === "employee" ? memberQuery(session.sub) : {};

  try {
    const routes = await Route.find(query)
      .sort({ date: -1 })
      .populate(ROUTE_POPULATE)
      .lean();
    return NextResponse.json({ routes });
  } catch (err) {
    console.error("GET /api/routes error:", err);
    return NextResponse.json({ error: "Could not load routes" }, { status: 500 });
  }
}

// POST /api/routes — admin builds a route, allocates its crew and truck,
// and the crew are notified.
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateRouteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();

  try {
    // Without this, a stale/mistyped id from the client would silently
    // create a route nobody can see — and a truck or person could be
    // double-booked for the same day.
    const allocationError = await validateAllocation(parsed.data);
    if (allocationError) {
      return NextResponse.json({ error: allocationError }, { status: 400 });
    }

    const { stops, ...rest } = parsed.data;
    const route = await Route.create({
      ...rest,
      stops: stops.map((label) => ({ label })),
    });

    await notifyCrew(
      routeMemberIds(route),
      "route_assigned",
      `New route: ${route.zone} on ${formatRouteDate(route.date)}`,
      `${route.stops.length} stop${route.stops.length === 1 ? "" : "s"}, starting at ${route.stops[0].label}.`
    );

    const populated = await Route.findById(route._id).populate(ROUTE_POPULATE).lean();
    return NextResponse.json({ route: populated }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/routes error:", err);
    return NextResponse.json({ error: "Could not create route" }, { status: 500 });
  }
}
