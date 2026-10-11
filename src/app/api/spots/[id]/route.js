import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Spot from "@/lib/models/Spot";
import { requireUser } from "@/lib/requireUser";
import { normalizeZone } from "@/lib/spotConstants";
import { EditSpotSchema, zodErrorBody } from "@/lib/spotValidation";

/**
 * PATCH /api/spots/:id — an admin corrects a spot's details.
 * Body: any of { name, street, zone, description }.
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
  const parsed = EditSpotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
  }

  const changes = { ...parsed.data };
  // Update queries skip the model's pre("validate") hook, so keep zoneKey in step here.
  if (changes.zone !== undefined) changes.zoneKey = normalizeZone(changes.zone);

  try {
    await dbConnect();
    const spot = await Spot.findByIdAndUpdate(
      params.id,
      { $set: changes },
      { new: true, runValidators: true }
    ).lean();
    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }
    return NextResponse.json({ spot });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
    }
    console.error("PATCH /api/spots/:id error:", err);
    return NextResponse.json({ error: "Could not update spot" }, { status: 500 });
  }
}
