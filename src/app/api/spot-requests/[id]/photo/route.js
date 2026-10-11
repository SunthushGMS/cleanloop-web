import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SpotRequest from "@/lib/models/SpotRequest";
import { requireUser } from "@/lib/requireUser";

/**
 * GET /api/spot-requests/:id/photo — the request's photo bytes.
 * Only admins and the volunteer who uploaded it can see it, even after
 * approval: photos can show people or number plates.
 */
export async function GET(request, { params }) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const found = await SpotRequest.findById(params.id).select("+photo reporter").lean();

    // Same 404 whether it doesn't exist or isn't yours, so ids can't be probed.
    const allowed =
      found && (session.role === "admin" || found.reporter.toString() === session.sub);
    if (!allowed || !found.photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // .lean() returns the Buffer as a BSON Binary; .buffer gives the bytes.
    const bytes = found.photo.data.buffer ?? found.photo.data;
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": found.photo.contentType,
        "Content-Length": String(found.photo.size),
        // Private: never stored by shared caches.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    console.error("GET /api/spot-requests/:id/photo error:", err);
    return NextResponse.json({ error: "Could not load photo" }, { status: 500 });
  }
}
