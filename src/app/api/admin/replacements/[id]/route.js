import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReplacementRequest from "@/lib/models/ReplacementRequest";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";
import { ReplacementTransitionSchema } from "@/lib/validators/lifecycle";
import { OPEN_REPLACEMENT_STATUSES } from "@/lib/lifecycleConstants";
import { retireResource, LifecycleError } from "@/lib/retireResource";

/**
 * PATCH /api/admin/replacements/:id
 * Body: { action: "approve" | "reject", note? } | { action: "cancel" } |
 *       { action: "complete", replacementResourceId?, replacedAt?, retireOld? }
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

  const parsed = ReplacementTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  await dbConnect();

  try {
    const record = await ReplacementRequest.findById(params.id);
    if (!record) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (input.action === "approve" || input.action === "reject") {
      if (record.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending requests can be approved or rejected." },
          { status: 409 }
        );
      }
      record.status = input.action === "approve" ? "approved" : "rejected";
      record.decidedBy = session.sub;
      record.decidedAt = new Date();
      record.decisionNote = input.note || "";
    } else if (input.action === "cancel") {
      if (!OPEN_REPLACEMENT_STATUSES.includes(record.status)) {
        return NextResponse.json({ error: "This request is already closed." }, { status: 409 });
      }
      record.status = "cancelled";
    } else {
      // complete
      if (record.status !== "approved") {
        return NextResponse.json(
          { error: "Only approved requests can be completed." },
          { status: 409 }
        );
      }

      const newId = input.replacementResourceId || null;
      if (newId) {
        if (String(record.resource) === newId) {
          return NextResponse.json(
            { error: "The replacement must be a different resource." },
            { status: 400 }
          );
        }
        const replacement = await Resource.findById(newId).select("status").lean();
        if (!replacement) {
          return NextResponse.json({ error: "Replacement resource not found" }, { status: 404 });
        }
        if (replacement.status === "retired") {
          return NextResponse.json(
            { error: "The replacement resource is retired." },
            { status: 409 }
          );
        }
      }

      const replacedAt = input.replacedAt || new Date();

      if (input.retireOld) {
        const current = await Resource.findById(record.resource).select("status").lean();
        if (current && current.status !== "retired") {
          await retireResource({
            resourceId: record.resource,
            reason: "Replaced (replacement request approved)",
            retiredAt: replacedAt,
            userId: session.sub,
          });
        }
      }

      record.status = "completed";
      record.replacedAt = replacedAt;
      record.replacementResource = newId;
    }

    await record.save();
    return NextResponse.json({ request: record });
  } catch (err) {
    if (err instanceof LifecycleError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/admin/replacements/:id error:", err);
    return NextResponse.json({ error: "Could not update request" }, { status: 500 });
  }
}