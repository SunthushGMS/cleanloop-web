import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Zone from "@/lib/models/Zone";
import { requireUser } from "@/lib/requireUser";

const UpdateZoneSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  stops: z.array(z.string().trim().min(1)).optional(),
});

// PATCH /api/zones/:id — admin renames a zone and/or replaces its stop
// list. `stops` is sent as the FULL current list on every save (same
// pattern as ResourceFormModal's meta fields) — not a single add/remove —
// so this stays a simple, idempotent replace rather than needing separate
// add-stop/remove-stop endpoints.
export async function PATCH(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  try {
    const zone = await Zone.findByIdAndUpdate(params.id, parsed.data, {
      new: true,
      runValidators: true,
    });
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }
    return NextResponse.json({ zone });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "A zone with that name already exists" },
        { status: 409 }
      );
    }
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid zone id" }, { status: 400 });
    }
    console.error("PATCH /api/zones/:id error:", err);
    return NextResponse.json({ error: "Could not update zone" }, { status: 500 });
  }
}

/**
 * DELETE /api/zones/:id — admin removes a zone.
 *
 * NOTE (explicit trade-off, matching decisions-and-principles.md's
 * pattern of documenting deferred work rather than silently skipping
 * it): this does NOT cascade-clean references. Residents, schedules,
 * resources, and routes that already store this zone's name as a plain
 * string keep that value even after the Zone document is gone — it just
 * stops appearing as a future dropdown choice. A real referential-
 * integrity pass (warn "N records reference this zone" before deleting)
 * is a legitimate next step, out of scope for this pass.
 */
export async function DELETE(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();
  try {
    const zone = await Zone.findByIdAndDelete(params.id);
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid zone id" }, { status: 400 });
    }
    console.error("DELETE /api/zones/:id error:", err);
    return NextResponse.json({ error: "Could not delete zone" }, { status: 500 });
  }
}