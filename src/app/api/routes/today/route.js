import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Route from "@/lib/models/Route";
import { requireUser } from "@/lib/requireUser";
import { ROUTE_POPULATE, memberQuery, todayBounds } from "@/lib/routes";

/**
 * GET /api/routes/today
 * ---------------------------------------------------------------------
 * CPT-42 Daily Route Viewing. Returns the single route the logged-in
 * employee is on for "today" — as the lead OR as allocated crew
 * (CPT-39) — with the truck and teammates populated.
 *
 * This is intentionally a separate endpoint from GET /api/routes (which
 * returns the employee's full route history) — the dashboard's "what do
 * I do right now" view shouldn't have to fetch + filter the whole list
 * client-side every time it loads.
 *
 * Employee-only: an admin has no "today's route" of their own.
 */
export async function GET() {
  const session = requireUser(["employee"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  // See todayBounds() in src/lib/routes.js for the timezone convention.
  const { start, end } = todayBounds();

  try {
    // findOne, not find: validateAllocation (src/lib/routes.js) prevents
    // anyone being booked onto two routes on the same day, so there's at
    // most one match.
    const route = await Route.findOne({
      ...memberQuery(session.sub),
      date: { $gte: start, $lt: end },
    })
      .populate(ROUTE_POPULATE)
      .lean();

    // No route today isn't an error — it's a valid, common state (day off,
    // route not yet built by ops). Return 200 with route: null so the
    // client can render a proper empty state instead of an error banner.
    return NextResponse.json({ route: route || null });
  } catch (err) {
    console.error("GET /api/routes/today error:", err);
    return NextResponse.json({ error: "Could not load today's route" }, { status: 500 });
  }
}
