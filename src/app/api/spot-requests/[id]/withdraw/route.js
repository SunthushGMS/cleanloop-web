import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SpotRequest from "@/lib/models/SpotRequest";
import { requireUser } from "@/lib/requireUser";

/**
 * POST /api/spot-requests/:id/withdraw — the reporter withdraws a request
 * that's still pending. The photo is deleted, since nobody will review it.
 */
export async function POST(request, { params }) {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();

    // Atomic: only matches the caller's own request while it's still pending,
    // so a withdraw can't race an admin's approve/reject.
    const updated = await SpotRequest.findOneAndUpdate(
      { _id: params.id, reporter: session.sub, status: "pending" },
      { $set: { status: "withdrawn", hasPhoto: false }, $unset: { photo: "" } },
      { new: true }
    ).lean();

    if (updated) return NextResponse.json({ request: updated });

    const existing = await SpotRequest.findById(params.id).select("reporter status").lean();
    if (!existing || existing.reporter.toString() !== session.sub) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: `This request has already been ${existing.status}` },
      { status: 409 }
    );
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }
    console.error("POST /api/spot-requests/:id/withdraw error:", err);
    return NextResponse.json({ error: "Could not withdraw request" }, { status: 500 });
  }
}
