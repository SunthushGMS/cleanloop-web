import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Allocation from "@/lib/models/Allocation";
import Resource from "@/lib/models/Resource";
import Route from "@/lib/models/Route";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { CreateAllocationSchema } from "@/lib/validators/allocation";
import { STATUS_LABEL } from "@/lib/resourceConstants";

// Route/Resource/User are imported above so Mongoose has them registered for populate().
const POPULATE = [
  { path: "resource", select: "name category registrationNumber zone" },
  { path: "route", select: "zone date" },
  { path: "driver", select: "name" },
];

/**
 * GET /api/admin/allocations?status=active|released
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  const status = new URL(request.url).searchParams.get("status");
  const filter = {};
  if (status === "active" || status === "released") filter.status = status;

  try {
    const allocations = await Allocation.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .populate(POPULATE)
      .lean();
    return NextResponse.json({ allocations });
  } catch (err) {
    console.error("GET /api/admin/allocations error:", err);
    return NextResponse.json({ error: "Could not load allocations" }, { status: 500 });
  }
}

/**
 * POST /api/admin/allocations
 * Body: see CreateAllocationSchema. Only an "Available" (active) resource can be allocated.
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

  const parsed = CreateAllocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { resourceId, routeId, driverId, date, shiftStart, shiftEnd, notes } = parsed.data;

  await dbConnect();

  try {
    if (driverId && !(await User.exists({ _id: driverId, role: "employee" }))) {
      return NextResponse.json({ error: "Driver must be a collection employee" }, { status: 400 });
    }
    if (routeId && !(await Route.exists({ _id: routeId }))) {
      return NextResponse.json({ error: "Route not found" }, { status: 400 });
    }

    // Atomic claim: only succeeds if the resource is still Available, so two
    // admins can't allocate the same truck at the same time.
    const resource = await Resource.findOneAndUpdate(
      { _id: resourceId, status: "active" },
      { $set: { status: "in_use", assignedTo: driverId || null } },
      { new: true }
    );

    if (!resource) {
      const current = await Resource.findById(resourceId).select("status").lean();
      if (!current) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      }
      return NextResponse.json(
        {
          error: `This resource is not available (status: ${
            STATUS_LABEL[current.status] || current.status
          }).`,
        },
        { status: 409 }
      );
    }

    try {
      const allocation = await Allocation.create({
        resource: resource._id,
        route: routeId || null,
        driver: driverId || null,
        date,
        shiftStart: shiftStart || "",
        shiftEnd: shiftEnd || "",
        notes: notes || "",
        allocatedBy: session.sub,
      });
      await allocation.populate(POPULATE);
      return NextResponse.json({ allocation }, { status: 201 });
    } catch (err) {
      // Roll the resource back so it isn't stuck "In use" with no record.
      await Resource.updateOne(
        { _id: resource._id },
        { $set: { status: "active", assignedTo: null } }
      );
      throw err;
    }
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "This resource already has an active allocation. Release it first." },
        { status: 409 }
      );
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/admin/allocations error:", err);
    return NextResponse.json({ error: "Could not create allocation" }, { status: 500 });
  }
}