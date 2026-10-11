import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Spot from "@/lib/models/Spot";
import { requireUser } from "@/lib/requireUser";

/**
 * POST /api/spots/:id/adopt — a volunteer adopts an unadopted spot.
 * One volunteer per spot: the update only matches while nobody has adopted
 * it, so two volunteers clicking at once can't both own it.
 */
export async function POST(request, { params }) {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const spot = await Spot.findOneAndUpdate(
      { _id: params.id, adopter: null },
      { $set: { adopter: session.sub, adoptedAt: new Date() } },
      { new: true }
    ).lean();
    if (spot) return NextResponse.json({ spot });

    const existing = await Spot.findById(params.id).select("adopter").lean();
    if (!existing) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }
    const mine = existing.adopter?.toString() === session.sub;
    return NextResponse.json(
      { error: mine ? "You've already adopted this spot" : "Another volunteer has already adopted this spot" },
      { status: 409 }
    );
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
    }
    console.error("POST /api/spots/:id/adopt error:", err);
    return NextResponse.json({ error: "Could not adopt spot" }, { status: 500 });
  }
}
