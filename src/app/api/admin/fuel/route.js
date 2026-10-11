import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import FuelLog from "@/lib/models/FuelLog";
import Resource from "@/lib/models/Resource";
import User from "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { CreateFuelSchema } from "@/lib/validators/fuel";
import { VEHICLE_CATEGORIES } from "@/lib/resourceConstants";
import { monthRange } from "@/lib/fuelStats";

// Resource and User are imported above so Mongoose has them registered for populate().
const POPULATE = [
  { path: "resource", select: "name category registrationNumber" },
  { path: "driver", select: "name" },
];

/**
 * GET /api/admin/fuel?month=YYYY-MM&resourceId=<id>
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const filter = {};

  const resourceId = searchParams.get("resourceId");
  if (resourceId) {
    if (!/^[a-f\d]{24}$/i.test(resourceId)) {
      return NextResponse.json({ error: "Invalid resource id" }, { status: 400 });
    }
    filter.resource = resourceId;
  }

  const month = searchParams.get("month");
  if (month) {
    const { start, end } = monthRange(month);
    filter.date = { $gte: start, $lt: end };
  }

  await dbConnect();

  try {
    const logs = await FuelLog.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .populate(POPULATE)
      .lean();
    return NextResponse.json({ logs });
  } catch (err) {
    console.error("GET /api/admin/fuel error:", err);
    return NextResponse.json({ error: "Could not load fuel logs" }, { status: 500 });
  }
}

/**
 * POST /api/admin/fuel
 * Body: see CreateFuelSchema. Vehicles only.
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

  const parsed = CreateFuelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { resourceId, date, fuelType, litres, cost, odometer, driverId, notes } = parsed.data;

  await dbConnect();

  try {
    const resource = await Resource.findById(resourceId).select("category status").lean();
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (!VEHICLE_CATEGORIES.includes(resource.category)) {
      return NextResponse.json(
        { error: "Fuel can only be recorded for vehicles (truck, tractor, lorry, compactor)." },
        { status: 400 }
      );
    }
    if (resource.status === "retired") {
      return NextResponse.json({ error: "Retired vehicles cannot be fuelled." }, { status: 409 });
    }
    if (driverId && !(await User.exists({ _id: driverId, role: "employee" }))) {
      return NextResponse.json({ error: "Driver must be a collection employee" }, { status: 400 });
    }

    // The odometer can't go backwards compared with the previous reading.
    if (odometer !== null && odometer !== undefined) {
      const previous = await FuelLog.findOne({
        resource: resourceId,
        date: { $lte: date },
        odometer: { $ne: null },
      })
        .sort({ date: -1, odometer: -1 })
        .lean();

      if (previous && odometer < previous.odometer) {
        return NextResponse.json(
          {
            error: `Odometer (${odometer} km) is lower than the previous reading (${
              previous.odometer
            } km on ${previous.date.toISOString().slice(0, 10)}).`,
          },
          { status: 400 }
        );
      }
    }

    const log = await FuelLog.create({
      resource: resourceId,
      date,
      fuelType,
      litres,
      cost: cost ?? null,
      odometer: odometer ?? null,
      driver: driverId || null,
      notes: notes || "",
      createdBy: session.sub,
    });
    await log.populate(POPULATE);
    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/admin/fuel error:", err);
    return NextResponse.json({ error: "Could not save fuel log" }, { status: 500 });
  }
}