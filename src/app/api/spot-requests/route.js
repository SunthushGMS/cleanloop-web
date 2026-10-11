import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import SpotRequest from "@/lib/models/SpotRequest";
// Imported so populate("spot") / populate("adopter") know these models.
import "@/lib/models/Spot";
import "@/lib/models/User";
import { requireUser } from "@/lib/requireUser";
import { readUploadedPhoto } from "@/lib/spotPhoto";
import { MAX_PENDING_REQUESTS, MAX_PHOTO_BYTES } from "@/lib/spotConstants";

const CreateRequestSchema = z.object({
  landmark: z
    .string()
    .trim()
    .min(3, "Landmark or name must be at least 3 characters")
    .max(120, "Landmark or name must be 120 characters or fewer"),
  street: z.string().trim().max(160, "Street must be 160 characters or fewer").default(""),
  zone: z.string().trim().min(1, "Zone is required").max(80, "Zone must be 80 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or fewer")
    .default(""),
  // Checkbox: "true" / "on" when ticked, absent otherwise.
  wantsToAdopt: z
    .union([z.literal("true"), z.literal("on"), z.literal("false")])
    .optional()
    .transform((v) => v === "true" || v === "on"),
});

// Text fields plus a ~400 KB photo; anything far bigger is refused before parsing.
const MAX_BODY_BYTES = MAX_PHOTO_BYTES + 64 * 1024;

/**
 * GET /api/spot-requests — the calling volunteer's own requests, newest
 * first, with the resulting spot (if approved or merged). Never includes
 * photo bytes; use /api/spot-requests/:id/photo.
 */
export async function GET() {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const requests = await SpotRequest.find({ reporter: session.sub })
      .sort({ createdAt: -1 })
      .populate({
        path: "spot",
        select: "name zone adopter",
        populate: { path: "adopter", select: "name" },
      })
      .lean();
    return NextResponse.json({ requests });
  } catch (err) {
    console.error("GET /api/spot-requests error:", err);
    return NextResponse.json({ error: "Could not load requests" }, { status: 500 });
  }
}

/**
 * POST /api/spot-requests — a volunteer proposes a dumping spot.
 * multipart/form-data: landmark, street, zone, description, wantsToAdopt,
 * and an optional `photo` file (JPG/PNG/WebP, resized in the browser).
 */
export async function POST(request) {
  const session = requireUser(["volunteer"]);
  if (session instanceof NextResponse) return session;

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the request as a form upload" }, { status: 400 });
  }

  const field = (name) => {
    const v = form.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = CreateRequestSchema.safeParse({
    landmark: field("landmark") ?? "",
    street: field("street"),
    zone: field("zone") ?? "",
    description: field("description"),
    wantsToAdopt: field("wantsToAdopt"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { photo, error: photoError } = await readUploadedPhoto(form.get("photo"));
  if (photoError) {
    return NextResponse.json(
      { error: "Invalid input", details: { photo: [photoError] } },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    const pending = await SpotRequest.countDocuments({ reporter: session.sub, status: "pending" });
    if (pending >= MAX_PENDING_REQUESTS) {
      return NextResponse.json(
        {
          error: `You already have ${MAX_PENDING_REQUESTS} requests waiting for review. Wait for those, or withdraw one.`,
        },
        { status: 409 }
      );
    }

    const created = await SpotRequest.create({
      ...parsed.data,
      reporter: session.sub,
      photo,
      hasPhoto: Boolean(photo),
    });

    // Re-read without the photo bytes for the response.
    const spotRequest = await SpotRequest.findById(created._id).lean();
    return NextResponse.json({ request: spotRequest }, { status: 201 });
  } catch (err) {
    console.error("POST /api/spot-requests error:", err);
    return NextResponse.json({ error: "Could not submit request" }, { status: 500 });
  }
}
