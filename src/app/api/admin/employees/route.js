import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";

/**
 * GET /api/admin/employees
 * ---------------------------------------------------------------------
 * Collection crew members for the crew/driver dropdowns (RouteBuilder,
 * AllocationFormModal, FuelFormModal). Admin-only — this is account data
 * (name + email), not something other roles should be able to enumerate.
 *
 * Each entry carries both `id` (used by the resource screens) and `_id`
 * (used by RouteBuilder), so both consumers keep working.
 */
export async function GET() {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const users = await User.find({ role: "employee" })
      .select("_id name email")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({
      employees: users.map((u) => ({
        id: String(u._id),
        _id: String(u._id),
        name: u.name,
        email: u.email,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/employees error:", err);
    return NextResponse.json({ error: "Could not load crew members" }, { status: 500 });
  }
}
