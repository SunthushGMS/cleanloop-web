import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Campaign from "@/lib/models/Campaign";
import { requireUser } from "@/lib/requireUser";
import { isPastCampaignDate } from "@/lib/campaignDates";

// POST /api/campaigns/:id/rsvp — resident or volunteer marks themselves as attending.
export async function POST(request, { params }) {
  const session = requireUser(["resident", "volunteer"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  let campaign;
  try {
    campaign = await Campaign.findById(params.id);
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
    }
    console.error("POST /api/campaigns/:id/rsvp error:", err);
    return NextResponse.json({ error: "Could not process RSVP" }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (isPastCampaignDate(campaign.date)) {
    return NextResponse.json(
      { error: "This campaign has already taken place" },
      { status: 400 }
    );
  }

  if (campaign.organizer.toString() === session.sub) {
    return NextResponse.json(
      { error: "Organizers cannot RSVP to their own campaign" },
      { status: 400 }
    );
  }

  // Single atomic update: the filter only matches if this user isn't already
  // an attendee, so two simultaneous requests (e.g. a double-click) can't
  // both add them. No match means they were already on the list.
  try {
    const updated = await Campaign.findOneAndUpdate(
      { _id: campaign._id, "attendees.user": { $ne: session.sub } },
      { $push: { attendees: { user: session.sub, rsvpedAt: new Date() } } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Already RSVP'd" }, { status: 409 });
    }
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("POST /api/campaigns/:id/rsvp save error:", err);
    return NextResponse.json({ error: "Could not process RSVP" }, { status: 500 });
  }
}

// DELETE /api/campaigns/:id/rsvp — cancel an existing RSVP.
export async function DELETE(request, { params }) {
  const session = requireUser(["resident", "volunteer"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  let campaign;
  try {
    campaign = await Campaign.findById(params.id);
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
    }
    console.error("DELETE /api/campaigns/:id/rsvp error:", err);
    return NextResponse.json({ error: "Could not cancel RSVP" }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Single atomic update, mirroring POST: only matches if the user is
  // currently an attendee, and removes every entry for them.
  try {
    const updated = await Campaign.findOneAndUpdate(
      { _id: campaign._id, "attendees.user": session.sub },
      { $pull: { attendees: { user: session.sub } } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "No RSVP found to cancel" }, { status: 404 });
    }
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("DELETE /api/campaigns/:id/rsvp save error:", err);
    return NextResponse.json({ error: "Could not cancel RSVP" }, { status: 500 });
  }
}