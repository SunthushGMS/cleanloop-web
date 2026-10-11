import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Spot from "@/lib/models/Spot";
import CheckIn from "@/lib/models/CheckIn";
// Imported so populate("volunteer") knows the model.
import "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { localDayKey } from "@/lib/spotConstants";
import { CheckInSchema, zodErrorBody } from "@/lib/spotValidation";

/**
 * GET /api/spots/:id/checkins — the spot's history, newest first, so you can
 * see how the place has changed over months. Volunteers and admins.
 */
export async function GET(request, { params }) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const spot = await Spot.findById(params.id).select("_id").lean();
    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }
    const checkIns = await CheckIn.find({ spot: spot._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("volunteer", "name")
      .lean();
    return NextResponse.json({ checkIns });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
    }
    console.error("GET /api/spots/:id/checkins error:", err);
    return NextResponse.json({ error: "Could not load history" }, { status: 500 });
  }
}

/**
 * POST /api/spots/:id/checkins — the adopter records a visit.
 * Body: { condition: "clean" | "needs_attention" | "dumped", note? }.
 * One check-in per spot per day (enforced by a unique index).
 */
export async function POST(request, { params }) {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
  }

  try {
    await dbConnect();
    const spot = await Spot.findById(params.id).select("adopter").lean();
    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }
    if (spot.adopter?.toString() !== session.sub) {
      return NextResponse.json(
        { error: "Only the volunteer who adopted this spot can check in" },
        { status: 403 }
      );
    }

    // Make sure the unique (spot, day) index exists before relying on it.
    await CheckIn.init();

    let checkIn;
    try {
      checkIn = await CheckIn.create({
        spot: spot._id,
        volunteer: session.sub,
        ...parsed.data,
        day: localDayKey(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return NextResponse.json(
          { error: "You've already checked in on this spot today" },
          { status: 409 }
        );
      }
      throw err;
    }

    const updated = await Spot.findByIdAndUpdate(
      spot._id,
      {
        $set: {
          lastCheckIn: {
            condition: checkIn.condition,
            note: checkIn.note,
            at: checkIn.createdAt,
            by: session.sub,
          },
        },
      },
      { new: true }
    ).lean();

    return NextResponse.json({ checkIn, spot: updated }, { status: 201 });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
    }
    console.error("POST /api/spots/:id/checkins error:", err);
    return NextResponse.json({ error: "Could not save check-in" }, { status: 500 });
  }
}
