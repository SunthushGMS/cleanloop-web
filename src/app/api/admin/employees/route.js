import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";

/**
 * GET /api/admin/employees
 * ---------------------------------------------------------------------
 * Feeds the "Crew member" dropdown in RouteBuilder. Admin-only — this is
 * account data (name + email), not something other roles should be able
 * to enumerate.
 */
export async function GET() {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const employees = await User.find({ role: "employee" })
      .select("_id name email")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ employees });
  } catch (err) {
    console.error("GET /api/admin/employees error:", err);
    return NextResponse.json({ error: "Could not load crew members" }, { status: 500 });
  }
}