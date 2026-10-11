import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReplacementRequest from "@/lib/models/ReplacementRequest";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";
import { CreateReplacementSchema } from "@/lib/validators/lifecycle";
import { OPEN_REPLACEMENT_STATUSES } from "@/lib/lifecycleConstants";

// Resource is imported above so Mongoose has it registered for populate().
const POPULATE = [
  { path: "resource", select: "name category registrationNumber" },
  { path: "replacementResource", select: "name registrationNumber" },
];

/**
 * GET /api/admin/replacements  — all requests, newest first.
 */
export async function GET() {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const requests = await ReplacementRequest.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate(POPULATE)
      .lean();
    return NextResponse.json({ requests });
  } catch (err) {
    console.error("GET /api/admin/replacements error:", err);
    return NextResponse.json({ error: "Could not load replacement requests" }, { status: 500 });
  }
}

/**
 * POST /api/admin/replacements
 * Body: { resourceId, reason, estimatedCost? }
 */
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReplacementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { resourceId, reason, estimatedCost } = parsed.data;

  await dbConnect();

  try {
    const resource = await Resource.findById(resourceId).select("status").lean();
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (resource.status === "retired") {
      return NextResponse.json({ error: "This resource is already retired." }, { status: 409 });
    }
    if (
      await ReplacementRequest.exists({
        resource: resourceId,
        status: { $in: OPEN_REPLACEMENT_STATUSES },
      })
    ) {
      return NextResponse.json(
        { error: "This resource already has an open replacement request." },
        { status: 409 }
      );
    }

    const created = await ReplacementRequest.create({
      resource: resourceId,
      reason,
      estimatedCost: estimatedCost ?? null,
      requestedBy: session.sub,
    });
    await created.populate(POPULATE);
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/admin/replacements error:", err);
    return NextResponse.json({ error: "Could not create replacement request" }, { status: 500 });
  }
}