import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";

// Counts documents grouped by one field, returned as { value: count }.
async function countBy(field) {
  const rows = await Resource.aggregate([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

/**
 * GET /api/admin/resources/stats
 * Returns { total, byCategory, byStatus, byCondition } for ResourceStats.js
 */
export async function GET() {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const [total, byCategory, byStatus, byCondition] = await Promise.all([
      Resource.countDocuments({}),
      countBy("category"),
      countBy("status"),
      countBy("condition"),
    ]);
    return NextResponse.json({ total, byCategory, byStatus, byCondition });
  } catch (err) {
    console.error("GET /api/admin/resources/stats error:", err);
    return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
  }
}