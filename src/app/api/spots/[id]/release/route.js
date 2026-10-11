import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Spot from "@/lib/models/Spot";
import { requireUser } from "@/lib/requireUser";

/**
 * POST /api/spots/:id/release — the spot goes back to "needing a volunteer".
 * The adopter can release it ("I can't do this anymore"), and an admin can
 * take it back from a volunteer who has gone quiet. Check-in history stays.
 */
export async function POST(request, { params }) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  // Volunteers can only release their own spot; admins can release any adopted spot.
  const filter =
    session.role === "admin"
      ? { _id: params.id, adopter: { $ne: null } }
      : { _id: params.id, adopter: session.sub };

  try {
    await dbConnect();
    const spot = await Spot.findOneAndUpdate(
      filter,
      { $set: { adopter: null, adoptedAt: null } },
      { new: true }
    ).lean();
    if (spot) return NextResponse.json({ spot });

    const existing = await Spot.findById(params.id).select("adopter").lean();
    if (!existing) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }
    if (!existing.adopter) {
      return NextResponse.json({ error: "This spot isn't adopted" }, { status: 409 });
    }
    return NextResponse.json({ error: "Only the adopter can release this spot" }, { status: 403 });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
    }
    console.error("POST /api/spots/:id/release error:", err);
    return NextResponse.json({ error: "Could not release spot" }, { status: 500 });
  }
}
