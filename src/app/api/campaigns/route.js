import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Campaign from "@/lib/models/Campaign";
import { requireUser } from "@/lib/requireUser";
import { earliestTodayUTC, isPastCampaignDate } from "@/lib/campaignDates";

const CreateCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .default(""),
  zone: z.string().trim().max(80, "Zone must be 80 characters or fewer").optional().nullable(),
  // "YYYY-MM-DD" from the date input; stored as UTC midnight of that day.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), "Pick a valid date")
    .refine((date) => !isPastCampaignDate(date), "Campaign date can't be in the past"),
});

// GET /api/campaigns — upcoming campaigns, visible to any authenticated user.
export async function GET() {
  const session = requireUser(["resident", "admin", "employee", "volunteer"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const campaigns = await Campaign.find({ date: { $gte: earliestTodayUTC() } })
      .sort({ date: 1 })
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
