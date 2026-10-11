import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Allocation from "@/lib/models/Allocation";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";

/**
 * PATCH /api/admin/allocations/:id
 * Releases an active allocation (no body needed). History is kept.
 */
export async function PATCH(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const allocation = await Allocation.findOneAndUpdate(
      { _id: params.id, status: "active" },
      { $set: { status: "released", releasedAt: new Date() } },
      { new: true }
    );

    if (!allocation) {
      return NextResponse.json({ error: "Active allocation not found" }, { status: 404 });
    }

    // Only flip back to Available if it is still "in use". If the admin marked
    // it Breakdown/Maintenance meanwhile, keep that status.
    await Resource.updateOne(
      { _id: allocation.resource, status: "in_use" },
      { $set: { status: "active", assignedTo: null } }
    );

    return NextResponse.json({ allocation });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid allocation id" }, { status: 400 });
    }
    console.error("PATCH /api/admin/allocations/:id error:", err);
    return NextResponse.json({ error: "Could not release allocation" }, { status: 500 });
  }
}