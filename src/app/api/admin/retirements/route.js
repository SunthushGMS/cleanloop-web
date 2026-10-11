import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import RetirementRecord from "@/lib/models/RetirementRecord";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";
import { CreateRetirementSchema } from "@/lib/validators/lifecycle";
import { retireResource, LifecycleError } from "@/lib/retireResource";

// Resource is imported above so Mongoose has it registered for populate().
const POPULATE = { path: "resource", select: "name category registrationNumber purchaseCost" };

/**
 * GET /api/admin/retirements?state=retired|disposed
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  const state = new URL(request.url).searchParams.get("state");
  const filter = {};
  if (state === "retired" || state === "disposed") filter.status = state;

  try {
    const records = await RetirementRecord.find(filter)
      .sort({ retiredAt: -1 })
      .limit(200)
      .populate(POPULATE)
      .lean();
    return NextResponse.json({ records });
  } catch (err) {
    console.error("GET /api/admin/retirements error:", err);
    return NextResponse.json({ error: "Could not load retirements" }, { status: 500 });
  }
}

/**
 * POST /api/admin/retirements
 * Body: { resourceId, reason, retiredAt? }
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

  const parsed = CreateRetirementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { resourceId, reason, retiredAt } = parsed.data;

  await dbConnect();

  try {
    const record = await retireResource({
      resourceId,
      reason,
      retiredAt: retiredAt || undefined,
      userId: session.sub,
    });
    await record.populate(POPULATE);
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    if (err instanceof LifecycleError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "This resource already has a retirement record." },
        { status: 409 }
      );
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/admin/retirements error:", err);
    return NextResponse.json({ error: "Could not retire resource" }, { status: 500 });
  }
}