import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Resource from "@/lib/models/Resource";
import Allocation from "@/lib/models/Allocation";
import MaintenanceRecord from "@/lib/models/MaintenanceRecord";
import { requireUser } from "@/lib/requireUser";
import { VEHICLE_CATEGORIES } from "@/lib/resourceConstants";
import { buildUtilization, UNDERUSED_BELOW, OVERUSED_ABOVE } from "@/lib/utilization";

const ALLOWED_DAYS = [7, 30, 90];

/**
 * GET /api/admin/utilization?days=7|30|90
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = ALLOWED_DAYS.includes(requested) ? requested : 30;

  await dbConnect();

  try {
    const now = new Date();
    // Fetch a little wider than the period; buildUtilization filters exactly.
    const since = new Date(now.getTime() - (days + 2) * 86400000);
    const until = new Date(now.getTime() + 2 * 86400000);

    const [resources, allocations, records] = await Promise.all([
      Resource.find({ category: { $in: VEHICLE_CATEGORIES }, status: { $ne: "retired" } })
        .select("name category registrationNumber status createdAt")
        .lean(),
      Allocation.find({ date: { $gte: since, $lt: until } })
        .select("resource date shiftStart shiftEnd")
        .lean(),
      MaintenanceRecord.find({
        $or: [
          { status: { $in: ["reported", "scheduled", "in_progress"] } },
          { completedAt: { $gte: since } },
          { status: "cancelled", updatedAt: { $gte: since } },
        ],
      })
        .select("resource type status reportedAt startedAt completedAt createdAt updatedAt")
        .lean(),
    ]);

    const rows = buildUtilization({ resources, allocations, records, days, now });

    return NextResponse.json({
      days,
      thresholds: { underusedBelow: UNDERUSED_BELOW, overusedAbove: OVERUSED_ABOVE },
      rows,
    });
  } catch (err) {
    console.error("GET /api/admin/utilization error:", err);
    return NextResponse.json({ error: "Could not calculate utilization" }, { status: 500 });
  }
}