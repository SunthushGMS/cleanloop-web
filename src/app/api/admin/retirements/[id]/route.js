import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import RetirementRecord from "@/lib/models/RetirementRecord";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";
import { RetirementTransitionSchema } from "@/lib/validators/lifecycle";

/**
 * PATCH /api/admin/retirements/:id
 * Body: { action: "dispose", disposalMethod, disposalDate, disposalValue?, disposalReference?, notes? }
 *    or { action: "reinstate" }  (only before disposal)
 */
export async function PATCH(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RetirementTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  await dbConnect();

  try {
    const record = await RetirementRecord.findById(params.id);
    if (!record) {
      return NextResponse.json({ error: "Retirement record not found" }, { status: 404 });
    }
    if (record.status === "disposed") {
      return NextResponse.json(
        { error: "This resource has already been disposed of." },
        { status: 409 }
      );
    }

    if (input.action === "dispose") {
      record.status = "disposed";
      record.disposalMethod = input.disposalMethod;
      record.disposalDate = input.disposalDate;
      record.disposalValue = input.disposalValue ?? null;
      record.disposalReference = input.disposalReference || "";
      if (input.notes !== undefined) record.notes = input.notes;
      await record.save();
      return NextResponse.json({ record });
    }

    // reinstate: back to Available, retirement record removed
    await Resource.updateOne(
      { _id: record.resource, status: "retired" },
      { $set: { status: "active" } }
    );
    await record.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/admin/retirements/:id error:", err);
    return NextResponse.json({ error: "Could not update retirement record" }, { status: 500 });
  }
}