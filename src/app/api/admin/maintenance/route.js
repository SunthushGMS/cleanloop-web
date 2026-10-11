import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import MaintenanceRecord from "@/lib/models/MaintenanceRecord";
import Resource from "@/lib/models/Resource";
import Allocation from "@/lib/models/Allocation";
import Route from "@/lib/models/Route";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { CreateMaintenanceSchema } from "@/lib/validators/maintenance";
import { OPEN_STATUSES, CLOSED_STATUSES } from "@/lib/maintenanceConstants";

// Route/User/Allocation are imported above so Mongoose has them registered for populate().
const POPULATE = [
  { path: "resource", select: "name category registrationNumber status" },
  { path: "replacementResource", select: "name registrationNumber" },
  {
    path: "interruptedAllocation",
    select: "driver route date shiftStart shiftEnd",
    populate: [
      { path: "driver", select: "name" },
      { path: "route", select: "zone date" },
    ],
  },
];

/**
 * GET /api/admin/maintenance?state=open|closed
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  const state = new URL(request.url).searchParams.get("state");
  const filter = {};
  if (state === "open") filter.status = { $in: OPEN_STATUSES };
  if (state === "closed") filter.status = { $in: CLOSED_STATUSES };

  try {
    const records = await MaintenanceRecord.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate(POPULATE)
      .lean();
    return NextResponse.json({ records });
  } catch (err) {
    console.error("GET /api/admin/maintenance error:", err);
    return NextResponse.json({ error: "Could not load maintenance records" }, { status: 500 });
  }
}

/**
 * POST /api/admin/maintenance
 * type "breakdown": resource -> Breakdown, active allocation (if any) released.
 * type "preventive": creates a Scheduled record, resource untouched until started.
 */
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateMaintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { resourceId, type, description, scheduledFor, estimatedCompletion, repairedBy } =
    parsed.data;

  await dbConnect();

  try {
    const existing = await Resource.findById(resourceId).select("status").lean();
    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (existing.status === "retired") {
      return NextResponse.json({ error: "Retired resources cannot be serviced" }, { status: 409 });
    }

    const common = {
      resource: resourceId,
      type,
      description,
      estimatedCompletion: estimatedCompletion || null,
      repairedBy: repairedBy || "",
      createdBy: session.sub,
    };

    if (type === "preventive") {
      const record = await MaintenanceRecord.create({
        ...common,
        status: "scheduled",
        scheduledFor,
      });
      await record.populate(POPULATE);
      return NextResponse.json({ record }, { status: 201 });
    }

    // --- breakdown ---
    const alreadyOpen = await MaintenanceRecord.exists({
      resource: resourceId,
      type: "breakdown",
      status: { $in: ["reported", "in_progress"] },
    });
    if (alreadyOpen) {
      return NextResponse.json(
        { error: "This resource already has an open breakdown." },
        { status: 409 }
      );
    }

    const previous = await Resource.findOneAndUpdate(
      { _id: resourceId, status: { $ne: "retired" } },
      { $set: { status: "breakdown", assignedTo: null } },
      { new: false } // returns the document as it was BEFORE the update
    );
    if (!previous) {
      return NextResponse.json({ error: "Retired resources cannot be serviced" }, { status: 409 });
    }

    // If it was out on a route, end that allocation and remember it on the record.
    const released = await Allocation.findOneAndUpdate(
      { resource: resourceId, status: "active" },
      { $set: { status: "released", releasedAt: new Date() } },
      { new: true }
    );

    let record;
    try {
      record = await MaintenanceRecord.create({
        ...common,
        status: "reported",
        interruptedAllocation: released ? released._id : null,
      });
    } catch (err) {
      // Undo the side effects so nothing is left half-done.
      await Resource.updateOne(
        { _id: resourceId },
        { $set: { status: previous.status, assignedTo: previous.assignedTo } }
      );
      if (released) {
        await Allocation.updateOne(
          { _id: released._id },
          { $set: { status: "active", releasedAt: null } }
        );
      }
      throw err;
    }

    await record.populate(POPULATE);
    return NextResponse.json({ record, interrupted: Boolean(released) }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/admin/maintenance error:", err);
    return NextResponse.json({ error: "Could not save maintenance record" }, { status: 500 });
  }
}