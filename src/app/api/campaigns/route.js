import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Campaign from "@/lib/models/Campaign";
import { requireUser } from "@/lib/requireUser";
import { earliestTodayUTC } from "@/lib/campaignDates";
import { CreateCampaignSchema } from "@/lib/campaignValidation";

const ListQuerySchema = z.object({
  // all: every campaign; mine: ones I organize; joined: ones I RSVP'd to.
  scope: z.enum(["all", "mine", "joined"]).default("all"),
  when: z.enum(["upcoming", "past", "all"]).default("upcoming"),
});

/**
 * GET /api/campaigns?scope=all|mine|joined&when=upcoming|past|all
 * Defaults to scope=all&when=upcoming. Visible to any authenticated user.
 * Cancelled campaigns are included (the UI badges them) so people who
 * RSVP'd can see the cancellation instead of the card vanishing.
 */
export async function GET(request) {
  const session = requireUser(["resident", "admin", "employee", "volunteer"]);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const parsed = ListQuerySchema.safeParse({
    scope: searchParams.get("scope") ?? undefined,
    when: searchParams.get("when") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { scope, when } = parsed.data;

  const filter = {};
  if (scope === "mine") filter.organizer = session.sub;
  if (scope === "joined") filter["attendees.user"] = session.sub;
  if (when === "upcoming") filter.date = { $gte: earliestTodayUTC() };
  if (when === "past") filter.date = { $lt: earliestTodayUTC() };

  try {
    await dbConnect();
    // Upcoming lists read soonest-first; history reads most-recent-first.
    const campaigns = await Campaign.find(filter)
      .sort({ date: when === "upcoming" ? 1 : -1 })
      .lean();
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("GET /api/campaigns error:", err);
    return NextResponse.json({ error: "Could not load campaigns" }, { status: 500 });
  }
}

// POST /api/campaigns — volunteers publish a cleanup/recycling drive.
export async function POST(request) {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    const campaign = await Campaign.create({
      ...parsed.data,
      zone: parsed.data.zone || null,
      organizer: session.sub,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error("POST /api/campaigns error:", err);
    return NextResponse.json({ error: "Could not create campaign" }, { status: 500 });
  }
}
