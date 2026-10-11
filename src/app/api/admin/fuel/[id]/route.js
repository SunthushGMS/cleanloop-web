import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import FuelLog from "@/lib/models/FuelLog";
import { requireUser } from "@/lib/requireUser";

/**
 * DELETE /api/admin/fuel/:id  — remove a mistaken fuel entry.
 */
export async function DELETE(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const log = await FuelLog.findByIdAndDelete(params.id);
    if (!log) {
      return NextResponse.json({ error: "Fuel log not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid fuel log id" }, { status: 400 });
    }
    console.error("DELETE /api/admin/fuel/:id error:", err);
    return NextResponse.json({ error: "Could not delete fuel log" }, { status: 500 });
  }
}