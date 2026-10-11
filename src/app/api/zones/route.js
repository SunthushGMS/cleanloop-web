import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Zone from "@/lib/models/Zone";
import { requireUser } from "@/lib/requireUser";

const CreateZoneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  stops: z.array(z.string().trim().min(1)).optional().default([]),
});

// GET /api/zones — intentionally PUBLIC (no requireUser call). The
// registration page needs to populate its zone dropdown BEFORE the
// visitor has a session — a list of zone names + stop labels isn't
// sensitive, same category as a public "which areas do you serve" list.
export async function GET() {
  await dbConnect();
  try {
    const zones = await Zone.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ zones });
  } catch (err) {
    console.error("GET /api/zones error:", err);
    return NextResponse.json({ error: "Could not load zones" }, { status: 500 });
  }
}

// POST /api/zones — admin-only: define a new zone, optionally seeded with
// known stop addresses right away.
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = CreateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  try {
    const zone = await Zone.create(parsed.data);
    return NextResponse.json({ zone }, { status: 201 });
  } catch (err) {
    // Mongoose duplicate-key error on the unique `name` index.
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "A zone with that name already exists" },
        { status: 409 }
      );
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/zones error:", err);
    return NextResponse.json({ error: "Could not create zone" }, { status: 500 });
  }
}