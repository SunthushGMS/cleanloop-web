import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import SpotRequest from "@/lib/models/SpotRequest";
import Spot from "@/lib/models/Spot";
import { requireUser } from "@/lib/requireUser";
import { claimPendingRequest, releaseClaim } from "@/lib/spotReview";

// The admin can correct the volunteer's details before the spot is created —
// mainly to keep zone spelling consistent. Omitted fields use the request's.
const ApproveSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120).optional(),
  street: z.string().trim().max(160, "Street must be 160 characters or fewer").optional(),
  zone: z.string().trim().min(1, "Zone is required").max(80).optional(),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer").optional(),
});

/**
 * POST /api/admin/spot-requests/:id/approve — creates a Spot from the request.
 * Body (optional edits): { name, street, zone, description }.
 * If the volunteer ticked "I'll adopt it", they become the adopter.
 */
export async function POST(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    const { request: claimed, response } = await claimPendingRequest(params.id, session, {
      status: "approved",
    });
    if (response) return response;

    let spot;
    try {
      const edits = parsed.data;
      spot = await Spot.create({
        name: edits.name ?? claimed.landmark,
        street: edits.street ?? claimed.street,
        zone: edits.zone ?? claimed.zone,
        description: edits.description ?? claimed.description,
        adopter: claimed.wantsToAdopt ? claimed.reporter : null,
        adoptedAt: claimed.wantsToAdopt ? new Date() : null,
        createdBy: session.sub,
        sourceRequest: claimed._id,
      });
    } catch (err) {
      // Don't leave the request "approved" with no spot behind it.
      await releaseClaim(claimed._id);
      if (err.name === "ValidationError") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const updated = await SpotRequest.findByIdAndUpdate(
      claimed._id,
      { $set: { spot: spot._id } },
      { new: true }
    ).lean();
    return NextResponse.json({ request: updated, spot }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/spot-requests/:id/approve error:", err);
    return NextResponse.json({ error: "Could not approve request" }, { status: 500 });
  }
}
