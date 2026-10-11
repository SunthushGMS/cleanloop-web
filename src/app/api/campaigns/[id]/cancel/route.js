import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Campaign from "@/lib/models/Campaign";
import { requireUser } from "@/lib/requireUser";
import { isPastCampaignDate } from "@/lib/campaignDates";
import { loadManagedCampaign, isCancelled } from "@/lib/campaignAccess";

/**
 * POST /api/campaigns/:id/cancel — organizer (or admin) cancels a campaign.
 * The campaign stays in every list with a "Cancelled" badge so people who
 * RSVP'd find out, rather than it disappearing.
 */
export async function POST(request, { params }) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const { campaign, response } = await loadManagedCampaign(params.id, session);
    if (response) return response;

    if (isCancelled(campaign)) {
      return NextResponse.json({ error: "Campaign is already cancelled" }, { status: 409 });
    }
    if (isPastCampaignDate(campaign.date)) {
      return NextResponse.json(
        { error: "This campaign has already taken place" },
        { status: 400 }
      );
    }

    const updated = await Campaign.findOneAndUpdate(
      { _id: campaign._id, status: { $ne: "cancelled" } },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Campaign is already cancelled" }, { status: 409 });
    }
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("POST /api/campaigns/:id/cancel error:", err);
    return NextResponse.json({ error: "Could not cancel campaign" }, { status: 500 });
  }
}
