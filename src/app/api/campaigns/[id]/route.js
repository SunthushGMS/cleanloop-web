import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Campaign from "@/lib/models/Campaign";
import { requireUser } from "@/lib/requireUser";
import { isPastCampaignDate } from "@/lib/campaignDates";
import { EditCampaignSchema, PAST_DATE_MESSAGE } from "@/lib/campaignValidation";
import { loadManagedCampaign, isCancelled } from "@/lib/campaignAccess";

/**
 * PATCH /api/campaigns/:id — organizer (or admin) edits details.
 * Body: any of { title, description, zone, date }; send only what changed.
 * Rules: cancelled campaigns can't be edited; a past campaign's date can't
 * be changed; a new date can't be in the past. Any real change sets editedAt
 * so attendees see an "Updated" badge.
 */
export async function PATCH(request, { params }) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EditCampaignSchema.safeParse(body);
  if (!parsed.success) {
    // formErrors holds whole-body problems such as "Nothing to update".
    const { formErrors, fieldErrors } = parsed.error.flatten();
    return NextResponse.json(
      { error: formErrors[0] || "Invalid input", details: fieldErrors },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    const { campaign, response } = await loadManagedCampaign(params.id, session);
    if (response) return response;

    if (isCancelled(campaign)) {
      return NextResponse.json(
        { error: "Cancelled campaigns can't be edited" },
        { status: 400 }
      );
    }

    // Keep only fields whose value actually differs from what's stored.
    const changes = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      const current = campaign[key];
      const same =
        key === "date"
          ? current.getTime() === value.getTime()
          : (current ?? "") === (value ?? "");
      if (!same) changes[key] = key === "zone" ? value || null : value;
    }

    if (changes.date) {
      if (isPastCampaignDate(campaign.date)) {
        return NextResponse.json(
          {
            error: "Invalid input",
            details: { date: ["This campaign has already taken place, so its date can't be changed"] },
          },
          { status: 400 }
        );
      }
      if (isPastCampaignDate(changes.date)) {
        return NextResponse.json(
          { error: "Invalid input", details: { date: [PAST_DATE_MESSAGE] } },
          { status: 400 }
        );
      }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ campaign });
    }

    // Filter on status too, so a cancel that lands mid-request isn't overwritten.
    const updated = await Campaign.findOneAndUpdate(
      { _id: campaign._id, status: { $ne: "cancelled" } },
      { $set: { ...changes, editedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Cancelled campaigns can't be edited" },
        { status: 400 }
      );
    }
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("PATCH /api/campaigns/:id error:", err);
    return NextResponse.json({ error: "Could not update campaign" }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/:id — hard delete, for mistakes only.
 * Refused once anyone has RSVP'd: those campaigns should be cancelled instead
 * so attendees see what happened.
 */
export async function DELETE(request, { params }) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const { campaign, response } = await loadManagedCampaign(params.id, session);
    if (response) return response;

    const RSVP_MESSAGE = "People have RSVP'd to this campaign. Cancel it instead so they're told.";
    if (campaign.attendees.length > 0) {
      return NextResponse.json({ error: RSVP_MESSAGE }, { status: 409 });
    }

    // Atomic: only deletes if still nobody has RSVP'd at this moment.
    const deleted = await Campaign.findOneAndDelete({ _id: campaign._id, attendees: { $size: 0 } });
    if (!deleted) {
      return NextResponse.json({ error: RSVP_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/campaigns/:id error:", err);
    return NextResponse.json({ error: "Could not delete campaign" }, { status: 500 });
  }
}
