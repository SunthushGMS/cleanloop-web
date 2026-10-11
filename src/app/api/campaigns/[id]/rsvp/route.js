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

  const alreadyRsvped = campaign.attendees.some(
    (a) => a.user.toString() === session.sub
  );
  if (alreadyRsvped) {
    return NextResponse.json({ error: "Already RSVP'd" }, { status: 409 });
  }

  try {
    campaign.attendees.push({ user: session.sub });
    await campaign.save();
    return NextResponse.json({ campaign });
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

  const before = campaign.attendees.length;
  campaign.attendees = campaign.attendees.filter(
    (a) => a.user.toString() !== session.sub
  );

  if (campaign.attendees.length === before) {
    return NextResponse.json({ error: "No RSVP found to cancel" }, { status: 404 });
  }

  try {
    await campaign.save();
    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("DELETE /api/campaigns/:id/rsvp save error:", err);
    return NextResponse.json({ error: "Could not cancel RSVP" }, { status: 500 });
  }
}