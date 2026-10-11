import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import MaintenanceRecord from "@/lib/models/MaintenanceRecord";
import Resource from "@/lib/models/Resource";
import Allocation from "@/lib/models/Allocation";
import { requireUser } from "@/lib/requireUser";
import { TransitionSchema } from "@/lib/validators/maintenance";
import { CLOSED_STATUSES } from "@/lib/maintenanceConstants";

// After a record closes, put the resource back to Available - but only if no
// OTHER open record still keeps it out of service.
async function restoreResourceIfClear(resourceId) {
  const stillBlocked = await MaintenanceRecord.exists({
    resource: resourceId,
    $or: [
      { type: "breakdown", status: { $in: ["reported", "in_progress"] } },
      { type: "preventive", status: "in_progress" },
    ],
  });
  if (stillBlocked) return;

  await Resource.updateOne(
    { _id: resourceId, status: { $in: ["breakdown", "maintenance"] } },
    { $set: { status: "active" } }
  );
}

/**
 * PATCH /api/admin/maintenance/:id
 * Body: { action: "start" } | { action: "cancel" } |
 *       { action: "complete", cost?, resolution?, nextServiceDate? }
 */
export async function PATCH(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = TransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  await dbConnect();

  try {
    const record = await MaintenanceRecord.findById(params.id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    if (CLOSED_STATUSES.includes(record.status)) {
      return NextResponse.json({ error: "This record is already closed." }, { status: 409 });
    }

    if (input.action === "start") {
      if (record.status === "in_progress") {
        return NextResponse.json({ error: "Work has already started." }, { status: 409 });
      }
      if (record.type === "preventive") {
        if (await Allocation.exists({ resource: record.resource, status: "active" })) {
          return NextResponse.json(
            { error: "This resource is allocated. Release it before starting maintenance." },
            { status: 409 }
          );
        }
        const updated = await Resource.findOneAndUpdate(
          { _id: record.resource, status: { $in: ["active", "maintenance"] } },
          { $set: { status: "maintenance" } }
        );
        if (!updated) {
          return NextResponse.json(
            { error: "This resource is not available for maintenance right now." },
            { status: 409 }
          );
        }
      }
      record.status = "in_progress";
      record.startedAt = new Date();
    } else if (input.action === "complete") {
      record.status = "completed";
      record.completedAt = new Date();
      if (input.cost !== undefined) record.cost = input.cost;
      if (input.resolution !== undefined) record.resolution = input.resolution;
    } else {
      record.status = "cancelled";
    }

    await record.save();

    if (input.action === "complete") {
      const set = { lastServicedAt: record.completedAt };
      if (input.nextServiceDate) set.nextMaintenanceAt = input.nextServiceDate;
      await Resource.updateOne({ _id: record.resource }, { $set: set });
    }
    if (input.action === "complete" || input.action === "cancel") {
      await restoreResourceIfClear(record.resource);
    }

    return NextResponse.json({ record });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid record id" }, { status: 400 });
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/admin/maintenance/:id error:", err);
    return NextResponse.json({ error: "Could not update record" }, { status: 500 });
  }
}