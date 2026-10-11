import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import { requireUser } from "@/lib/requireUser";
import { claimPendingRequest } from "@/lib/spotReview";

// A reason is required, so the volunteer learns why (prank, one-off pile, not recurring...).
const RejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Give the volunteer a short reason")
    .max(300, "Reason must be 300 characters or fewer"),
});

/** POST /api/admin/spot-requests/:id/reject — Body: { reason }. */
export async function POST(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    const { request: rejected, response } = await claimPendingRequest(params.id, session, {
      status: "rejected",
      rejectReason: parsed.data.reason,
    });
    if (response) return response;
    return NextResponse.json({ request: rejected });
  } catch (err) {
    console.error("POST /api/admin/spot-requests/:id/reject error:", err);
    return NextResponse.json({ error: "Could not reject request" }, { status: 500 });
  }
}
