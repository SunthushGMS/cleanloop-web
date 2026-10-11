import { NextResponse } from "next/server";
import SpotRequest from "@/lib/models/SpotRequest";

/**
 * Atomically moves a pending request to a reviewed status (approved /
 * merged / rejected). Only one admin action can win: if the request is no
 * longer pending, nothing changes and a 409 is returned.
 *
 * Returns { request } (the updated request, without photo bytes) or
 * { response } to return as-is.
 */
export async function claimPendingRequest(id, session, update) {
  let claimed;
  try {
    claimed = await SpotRequest.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { ...update, reviewedBy: session.sub, reviewedAt: new Date() } },
      { new: true }
    ).lean();
  } catch (err) {
    if (err.name === "CastError") {
      return { response: NextResponse.json({ error: "Invalid request id" }, { status: 400 }) };
    }
    throw err;
  }

  if (claimed) return { request: claimed };

  const existing = await SpotRequest.findById(id).select("status").lean();
  if (!existing) {
    return { response: NextResponse.json({ error: "Request not found" }, { status: 404 }) };
  }
  return {
    response: NextResponse.json(
      { error: `This request has already been ${existing.status}` },
      { status: 409 }
    ),
  };
}

/** Puts a claimed request back to pending if the follow-up step failed. */
export async function releaseClaim(id) {
  await SpotRequest.updateOne(
    { _id: id },
    { $set: { status: "pending", reviewedBy: null, reviewedAt: null, spot: null, rejectReason: "" } }
  );
}
