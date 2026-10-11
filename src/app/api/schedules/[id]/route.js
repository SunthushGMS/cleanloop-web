import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Schedule from "@/lib/models/Schedule";
import Zone from "@/lib/models/Zone";
import { requireUser } from "@/lib/requireUser";
import { notifyZoneResidents } from "@/lib/notify";
import { describeSchedule } from "@/lib/schedule";
import {
  ScheduleFieldsSchema,
  WINDOW_ERROR,
  duplicateMessage,
  findDuplicate,
  windowIsValid,
} from "@/lib/scheduleValidation";

// Every field optional; `status` is how a draft gets published (or a
// published schedule pulled back to draft).
const UpdateScheduleSchema = ScheduleFieldsSchema.partial().extend({
  status: z.enum(["draft", "published"]).optional(),
});

const CONTENT_FIELDS = ["zone", "dayOfWeek", "wasteType", "startTime", "endTime", "notes"];

function snapshot(doc) {
  const s = {};
  for (const f of CONTENT_FIELDS) s[f] = doc[f] || "";
  // No stored status = created before drafts existed = published.
  s.status = doc.status || "published";
  return s;
}

/**
 * CPT-40 Schedule Change Notifications. Works out who needs telling from
 * the before/after state, so residents hear about exactly the changes
 * that affect them — and never about drafts they could not see anyway.
 */
async function notifyScheduleChange(before, after) {
  const wasLive = before.status === "published";
  const isLive = after.status === "published";

  const cancelled = (s, reason) =>
    notifyZoneResidents(s.zone, {
      type: "schedule_cancelled",
      title: `Collection cancelled for ${s.zone}`,
      message: `${describeSchedule(s)} ${reason}`,
    });
  const published = (s) =>
    notifyZoneResidents(s.zone, {
      type: "schedule_published",
      title: `New collection schedule for ${s.zone}`,
      message: describeSchedule(s),
    });

  if (!wasLive && !isLive) return 0;
  if (!wasLive && isLive) return published(after);
  if (wasLive && !isLive) return cancelled(before, "has been withdrawn.");

  // Live before and after. A zone move is a cancellation for the old
  // zone's residents and a new schedule for the new zone's.
  if (before.zone !== after.zone) {
    const [a, b] = await Promise.all([
      cancelled(before, "no longer applies to your zone."),
      published(after),
    ]);
    return a + b;
  }

  const changed = CONTENT_FIELDS.some((f) => before[f] !== after[f]);
  if (!changed) return 0;

  return notifyZoneResidents(after.zone, {
    type: "schedule_changed",
    title: `Collection schedule changed for ${after.zone}`,
    message: `Was: ${describeSchedule(before)}. Now: ${describeSchedule(after)}.${
      after.notes && after.notes !== before.notes ? ` Note: ${after.notes}` : ""
    }`,
  });
}

// PATCH /api/schedules/:id — admin edits, publishes, or unpublishes.
export async function PATCH(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();

  try {
    const schedule = await Schedule.findById(params.id);
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const before = snapshot(schedule);
    const next = { ...before, ...parsed.data };

    if (!windowIsValid(next)) {
      return NextResponse.json(
        { error: "Invalid input", details: { [WINDOW_ERROR.path[0]]: [WINDOW_ERROR.message] } },
        { status: 400 }
      );
    }
    if (next.zone !== before.zone && !(await Zone.exists({ name: next.zone }))) {
      return NextResponse.json({ error: "Select a valid zone" }, { status: 400 });
    }
    if (await findDuplicate(next, schedule._id)) {
      return NextResponse.json({ error: duplicateMessage(next) }, { status: 409 });
    }

    schedule.set(parsed.data);
    if (before.status !== "published" && next.status === "published") {
      schedule.publishedAt = new Date();
    }
    await schedule.save();

    const notified = await notifyScheduleChange(before, snapshot(schedule));
    return NextResponse.json({ schedule, notified });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid schedule id" }, { status: 400 });
    }
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/schedules/:id error:", err);
    return NextResponse.json({ error: "Could not update schedule" }, { status: 500 });
  }
}

// DELETE /api/schedules/:id — admin removes a schedule. If residents
// could see it, they're told it's cancelled.
export async function DELETE(request, { params }) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const schedule = await Schedule.findByIdAndDelete(params.id).lean();
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    const before = snapshot(schedule);
    const notified = await notifyScheduleChange(before, { ...before, status: "draft" });
    return NextResponse.json({ success: true, notified });
  } catch (err) {
    if (err.name === "CastError") {
      return NextResponse.json({ error: "Invalid schedule id" }, { status: 400 });
    }
    console.error("DELETE /api/schedules/:id error:", err);
    return NextResponse.json({ error: "Could not delete schedule" }, { status: 500 });
  }
}
