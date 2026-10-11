import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/lib/models/Notification";
import { requireUser } from "@/lib/requireUser";

// PATCH /api/notifications/:id — mark one notification read. Scoped to
// the caller (user: session.sub) so nobody can touch another user's feed.
export async function PATCH(request, { params }) {
  const session = requireUser();
  if (session instanceof NextResponse) return session;

  await dbConnect();
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: params.id, user: session.sub },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ notification });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
    }
    console.error("PATCH /api/notifications/:id error:", err);
    return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
  }
}

// DELETE /api/notifications/:id — dismiss one notification.
export async function DELETE(request, { params }) {
  const session = requireUser();
  if (session instanceof NextResponse) return session;

  await dbConnect();
  try {
    const result = await Notification.deleteOne({ _id: params.id, user: session.sub });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
    }
    console.error("DELETE /api/notifications/:id error:", err);
    return NextResponse.json({ error: "Could not delete notification" }, { status: 500 });
  }
}
