import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import MaintenanceRecord from "@/lib/models/MaintenanceRecord";
import Resource from "@/lib/models/Resource";
import Allocation from "@/lib/models/Allocation";
import { requireUser } from "@/lib/requireUser";
import { ReplaceSchema } from "@/lib/validators/maintenance";
import { OPEN_STATUSES } from "@/lib/maintenanceConstants";
import { STATUS_LABEL } from "@/lib/resourceConstants";

/**
 * POST /api/admin/maintenance/:id/replace
 * Body: { replacementId }
 * Gives the route/driver/shift of the interrupted allocation to another
 * Available resource (US-17).
 */
export async function POST(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReplaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { replacementId } = parsed.data;

  await dbConnect();

  try {
    const record = await MaintenanceRecord.findById(params.id).populate("interruptedAllocation");
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    if (record.type !== "breakdown" || !OPEN_STATUSES.includes(record.status)) {
      return NextResponse.json(
        { error: "A replacement can only be assigned to an open breakdown." },
        { status: 409 }
      );
    }
    if (record.replacementResource) {
      return NextResponse.json({ error: "A replacement was already assigned." }, { status: 409 });
    }

    const original = record.interruptedAllocation;
    if (!original) {
      return NextResponse.json(
        { error: "This resource had no active allocation when it broke down, so there is nothing to replace." },
        { status: 409 }
      );
    }
    if (String(record.resource) === replacementId) {
      return NextResponse.json({ error: "Choose a different resource." }, { status: 400 });
    }

    // Atomic claim: only an Available resource can be taken.
    const claimed = await Resource.findOneAndUpdate(
      { _id: replacementId, status: "active" },
      { $set: { status: "in_use", assignedTo: original.driver || null } },
      { new: true }
    );
    if (!claimed) {
      const current = await Resource.findById(replacementId).select("status").lean();
      if (!current) {
        return NextResponse.json({ error: "Replacement resource not found" }, { status: 404 });
      }
      return NextResponse.json(
        {
          error: `That resource is not available (status: ${
            STATUS_LABEL[current.status] || current.status
          }).`,
        },
        { status: 409 }
      );
    }

    let allocation = null;
    try {
      allocation = await Allocation.create({
        resource: claimed._id,
        route: original.route || null,
        driver: original.driver || null,
        date: original.date,
        shiftStart: original.shiftStart,
        shiftEnd: original.shiftEnd,
        notes: "Replacement for a broken-down resource",
        allocatedBy: session.sub,
      });
      record.replacementResource = claimed._id;
      record.replacementAllocation = allocation._id;
      await record.save();
    } catch (err) {
      await Resource.updateOne(
        { _id: claimed._id },
        { $set: { status: "active", assignedTo: null } }
      );
      if (allocation) await Allocation.deleteOne({ _id: allocation._id });
      throw err;
    }

    return NextResponse.json({ replacement: { id: String(claimed._id), name: claimed.name } });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "That resource already has an active allocation." },
        { status: 409 }
      );
    }
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    console.error("POST /api/admin/maintenance/:id/replace error:", err);
    return NextResponse.json({ error: "Could not assign replacement" }, { status: 500 });
  }
}