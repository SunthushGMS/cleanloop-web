import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import SpotRequest from "@/lib/models/SpotRequest";
import Spot from "@/lib/models/Spot";
// Imported so populate("reporter") / populate("adopter") know the model.
import "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { REQUEST_STATUSES, normalizeZone } from "@/lib/spotConstants";

const QuerySchema = z.object({
  status: z.enum(["all", ...REQUEST_STATUSES]).default("pending"),
});

/**
 * GET /api/admin/spot-requests?status=pending|approved|merged|rejected|withdrawn|all
 * The admin review queue (default: pending, oldest first so nothing waits
 * forever). Each pending request includes `suggestions`: existing spots in
 * the same zone (case/spacing-insensitive), to catch duplicates for merging.
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ status: searchParams.get("status") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { status } = parsed.data;

  try {
    await dbConnect();
    const requests = await SpotRequest.find(status === "all" ? {} : { status })
      .sort({ createdAt: status === "pending" ? 1 : -1 })
      .populate("reporter", "name email")
      .populate("spot", "name zone")
      .lean();

    // One query for all suggestions, grouped by zone.
    const pending = requests.filter((r) => r.status === "pending");
    const zoneKeys = [...new Set(pending.map((r) => normalizeZone(r.zone)))];
    const spots = zoneKeys.length
      ? await Spot.find({ zoneKey: { $in: zoneKeys } })
          .select("name street zone zoneKey adopter")
          .populate("adopter", "name")
          .sort({ name: 1 })
          .lean()
      : [];
    for (const r of pending) {
      const key = normalizeZone(r.zone);
      r.suggestions = spots.filter((s) => s.zoneKey === key);
    }

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("GET /api/admin/spot-requests error:", err);
    return NextResponse.json({ error: "Could not load requests" }, { status: 500 });
  }
}
