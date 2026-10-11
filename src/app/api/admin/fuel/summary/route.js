import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import FuelLog from "@/lib/models/FuelLog";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";
import { monthRange, buildFuelSummary } from "@/lib/fuelStats";

/**
 * GET /api/admin/fuel/summary?month=YYYY-MM
 * Per-vehicle litres, cost, distance, km/L and a high-consumption flag.
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  const { month, start, end } = monthRange(new URL(request.url).searchParams.get("month"));

  await dbConnect();

  try {
    // All logs are needed (not just this month) to work out each vehicle's usual km/L.
    const logs = await FuelLog.find({}).select("resource date litres cost odometer").lean();

    const ids = [...new Set(logs.map((l) => String(l.resource)))];
    const resources = await Resource.find({ _id: { $in: ids } })
      .select("name category registrationNumber")
      .lean();
    const resourcesById = Object.fromEntries(resources.map((r) => [String(r._id), r]));

    const { rows, totals } = buildFuelSummary({ logs, resourcesById, start, end });
    return NextResponse.json({ month, totals, rows });
  } catch (err) {
    console.error("GET /api/admin/fuel/summary error:", err);
    return NextResponse.json({ error: "Could not load fuel summary" }, { status: 500 });
  }
}