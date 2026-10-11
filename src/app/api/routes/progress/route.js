import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Route from "@/lib/models/Route";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { ROUTE_POPULATE, routeDayBounds, todayBounds } from "@/lib/routes";

function statusOf(route) {
  if (route.completedAt) return "completed";
  if (route.startedAt || route.stops.some((s) => s.completed)) return "in_progress";
  return "not_started";
}

/**
 * GET /api/routes/progress
 * ---------------------------------------------------------------------
 * CPT-43 Collection Progress Tracking.
 *  - admin: every route for ?date=YYYY-MM-DD (default today), with crew,
 *    truck, per-stop status, and fleet-wide totals for the progress board.
 *  - resident: today's routes in THEIR zone only, reduced to what a
 *    resident needs (status + which stops are done) — no crew names.
 */
export async function GET(request) {
  const session = requireUser(["admin", "resident"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    if (session.role === "resident") {
      const user = await User.findById(session.sub).select("zone").lean();
      const { start, end } = todayBounds();
      const routes = await Route.find({
        zone: user?.zone || "__none__",
        date: { $gte: start, $lt: end },
      }).lean();

      return NextResponse.json({
        zone: user?.zone || null,
        routes: routes.map((r) => ({
          _id: r._id,
          status: statusOf(r),
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          completedStops: r.stops.filter((s) => s.completed).length,
          totalStops: r.stops.length,
          stops: r.stops.map((s) => ({ label: s.label, completed: s.completed, completedAt: s.completedAt })),
        })),
      });
    }

    const dateParam = new URL(request.url).searchParams.get("date");
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }
    const { start, end } = dateParam ? routeDayBounds(dateParam) : todayBounds();

    const routes = await Route.find({ date: { $gte: start, $lt: end } })
      .sort({ zone: 1 })
      .populate(ROUTE_POPULATE)
      .lean();

    const withStatus = routes.map((r) => ({ ...r, status: statusOf(r) }));
    const totals = {
      routes: withStatus.length,
      notStarted: withStatus.filter((r) => r.status === "not_started").length,
      inProgress: withStatus.filter((r) => r.status === "in_progress").length,
      completed: withStatus.filter((r) => r.status === "completed").length,
      stops: withStatus.reduce((n, r) => n + r.stops.length, 0),
      stopsCompleted: withStatus.reduce((n, r) => n + r.stops.filter((s) => s.completed).length, 0),
    };

    return NextResponse.json({ date: start.toISOString().slice(0, 10), routes: withStatus, totals });
  } catch (err) {
    console.error("GET /api/routes/progress error:", err);
    return NextResponse.json({ error: "Could not load progress" }, { status: 500 });
  }
}
