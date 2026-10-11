import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import SpotRequest from "@/lib/models/SpotRequest";
import Spot from "@/lib/models/Spot";
// Imported so populate("adopter") knows the model.
import "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { claimPendingRequest } from "@/lib/spotReview";

const MergeSchema = z.object({ spotId: z.string().min(1, "Choose a spot to merge into") });

/**
 * POST /api/admin/spot-requests/:id/merge — the request duplicates an
 * existing spot. Body: { spotId }.
 * If the volunteer ticked "I'll adopt it" and that spot has no adopter yet,
 * they become its adopter; if it's already adopted, they don't.
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
  const parsed = MergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    let spot;
    try {
      spot = await Spot.findById(parsed.data.spotId).select("_id").lean();
    } catch (err) {
      if (err.name !== "CastError") throw err;
    }
    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    const { request: claimed, response } = await claimPendingRequest(params.id, session, {
      status: "merged",
      spot: spot._id,
    });
    if (response) return response;

    // Atomic: only adopts if nobody has adopted the spot by now.
    let adopted = false;
    if (claimed.wantsToAdopt) {
      const result = await Spot.updateOne(
        { _id: spot._id, adopter: null },
        { $set: { adopter: claimed.reporter, adoptedAt: new Date() } }
      );
      adopted = result.modifiedCount === 1;
    }

    const merged = await SpotRequest.findById(claimed._id)
      .populate({ path: "spot", select: "name zone adopter", populate: { path: "adopter", select: "name" } })
      .lean();
    return NextResponse.json({ request: merged, adopted });
  } catch (err) {
    console.error("POST /api/admin/spot-requests/:id/merge error:", err);
    return NextResponse.json({ error: "Could not merge request" }, { status: 500 });
  }
}
