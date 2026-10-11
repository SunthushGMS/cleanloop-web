import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Campaign from "@/lib/models/Campaign";
import { requireUser } from "@/lib/requireUser";
import { hasCampaignDayStarted } from "@/lib/campaignDates";
import { loadManagedCampaign, isCancelled } from "@/lib/campaignAccess";

// Empty inputs arrive as "" or null; both mean "not recorded".
const optionalAmount = (label, { integer = false } = {}) => {
  let num = z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} can't be negative`);
  if (integer) num = num.int(`${label} must be a whole number`);
  return z.preprocess((v) => (v === "" || v === undefined ? null : v), num.max(100000, `${label} looks too large`).nullable());
};

const OutcomeSchema = z
  .object({
    bagsCollected: optionalAmount("Bags collected", { integer: true }),
    kgCollected: optionalAmount("Kg collected"),
    notes: z.string().trim().max(500, "Notes must be 500 characters or fewer").optional().default(""),
  })
  .refine((d) => d.bagsCollected !== null || d.kgCollected !== null || d.notes !== "", {
    message: "Enter at least one of bags, kg or notes",
  });

/**
 * PUT /api/campaigns/:id/outcome — the organizer records what happened.
 * Body: { bagsCollected?, kgCollected?, notes? }. Replaces any earlier outcome.
 * From the campaign day onwards, and not for cancelled campaigns.
 * Organizer only: this is their impact record, so no admin override.
 */
export async function PUT(request, { params }) {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = OutcomeSchema.safeParse(body);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = parsed.error.flatten();
    return NextResponse.json(
      { error: formErrors[0] || "Invalid input", details: fieldErrors },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    const { campaign, response } = await loadManagedCampaign(params.id, session, {
      allowAdmin: false,
    });
    if (response) return response;

    if (isCancelled(campaign)) {
      return NextResponse.json(
        { error: "Cancelled campaigns don't have an outcome" },
        { status: 400 }
      );
    }
    if (!hasCampaignDayStarted(campaign.date)) {
      return NextResponse.json(
        { error: "You can record the outcome from the day of the campaign" },
        { status: 400 }
      );
    }

    const updated = await Campaign.findByIdAndUpdate(
      campaign._id,
      { $set: { outcome: { ...parsed.data, recordedAt: new Date() } } },
      { new: true, runValidators: true }
    );
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("PUT /api/campaigns/:id/outcome error:", err);
    return NextResponse.json({ error: "Could not save outcome" }, { status: 500 });
  }
}
