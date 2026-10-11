import { NextResponse } from "next/server";
import Campaign from "@/lib/models/Campaign";

/**
 * Loads a campaign that the caller wants to change (edit, cancel, delete,
 * record outcome). Only the organizer may do that; admins can override when
 * `allowAdmin` is true. Call after dbConnect().
 *
 * Returns { campaign } on success, or { response } holding the 400/403/404
 * NextResponse to return as-is.
 */
export async function loadManagedCampaign(id, session, { allowAdmin = true } = {}) {
  let campaign;
  try {
    campaign = await Campaign.findById(id);
  } catch (err) {
    if (err.name === "CastError") {
      return { response: NextResponse.json({ error: "Invalid campaign id" }, { status: 400 }) };
    }
    throw err;
  }

  if (!campaign) {
    return { response: NextResponse.json({ error: "Campaign not found" }, { status: 404 }) };
  }

  const isOrganizer = campaign.organizer.toString() === session.sub;
  const isAdmin = allowAdmin && session.role === "admin";
  if (!isOrganizer && !isAdmin) {
    return {
      response: NextResponse.json(
        { error: "Only the organizer can change this campaign" },
        { status: 403 }
      ),
    };
  }

  return { campaign };
}

/** Campaigns created before `status` existed have none — treat that as active. */
export function isCancelled(campaign) {
  return campaign.status === "cancelled";
}
