import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";

/**
 * GET /api/admin/employees
 * Collection crew members (id + name only) for the driver dropdown.
 */
export async function GET() {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const users = await User.find({ role: "employee" }).select("name").sort({ name: 1 }).lean();
    return NextResponse.json({
      employees: users.map((u) => ({ id: String(u._id), name: u.name })),
    });
  } catch (err) {
    console.error("GET /api/admin/employees error:", err);
    return NextResponse.json({ error: "Could not load employees" }, { status: 500 });
  }
}