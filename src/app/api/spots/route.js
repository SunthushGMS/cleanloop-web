import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Spot from "@/lib/models/Spot";
// Imported so populate("adopter") knows the model.
import "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { spotHealth } from "@/lib/spotConstants";
import { CreateSpotSchema, zodErrorBody } from "@/lib/spotValidation";

const QuerySchema = z.object({
  // unadopted: "Spots needing a volunteer"; mine: spots I adopted; all: admin overview.
  view: z.enum(["unadopted", "mine", "all"]).default("unadopted"),
});

/**
 * GET /api/spots?view=unadopted|mine|all
 * Volunteers can list unadopted spots and their own; admins can list all.
 * Each spot includes `health` ({ adopted, stale, daysSinceCheck,
 * needsAttention }) computed by spotHealth().
 */
export async function GET(request) {
  const session = requireUser(["volunteer", "admin"]);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ view: searchParams.get("view") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
  }
  const { view } = parsed.data;

  if (view === "mine" && session.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers adopt spots" }, { status: 400 });
  }
  if (view === "all" && session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const filter =
    view === "unadopted" ? { adopter: null } : view === "mine" ? { adopter: session.sub } : {};

  try {
    await dbConnect();
    const spots = await Spot.find(filter)
      .sort({ zoneKey: 1, name: 1 })
      .populate("adopter", "name")
      .lean();
    const now = new Date();
    for (const spot of spots) spot.health = spotHealth(spot, now);
    return NextResponse.json({ spots });
  } catch (err) {
    console.error("GET /api/spots error:", err);
    return NextResponse.json({ error: "Could not load spots" }, { status: 500 });
  }
}

/** POST /api/spots — an admin adds a known problem spot directly. */
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateSpotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
  }

  try {
    await dbConnect();
    const spot = await Spot.create({ ...parsed.data, createdBy: session.sub });
    return NextResponse.json({ spot }, { status: 201 });
  } catch (err) {
    console.error("POST /api/spots error:", err);
    return NextResponse.json({ error: "Could not create spot" }, { status: 500 });
  }
}
