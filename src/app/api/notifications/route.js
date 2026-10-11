import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/lib/models/Notification";
import { requireUser } from "@/lib/requireUser";

const PAGE_SIZE = 20;

// GET /api/notifications — the caller's most recent notifications plus
// their total unread count (the bell badge). Any logged-in role.
export async function GET() {
  const session = requireUser();
  if (session instanceof NextResponse) return session;

  await dbConnect();
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: session.sub })
        .sort({ createdAt: -1 })
        .limit(PAGE_SIZE)
        .lean(),
      Notification.countDocuments({ user: session.sub, readAt: null }),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark ALL of the caller's notifications read.
export async function PATCH() {
  const session = requireUser();
  if (session instanceof NextResponse) return session;

  await dbConnect();
  try {
    await Notification.updateMany(
      { user: session.sub, readAt: null },
      { readAt: new Date() }
    );
    return NextResponse.json({ ok: true, unreadCount: 0 });
  } catch (err) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Could not update notifications" }, { status: 500 });
  }
}
