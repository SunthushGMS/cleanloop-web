import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Schedule from "@/lib/models/Schedule";
import User from "@/lib/models/User";
import Zone from "@/lib/models/Zone";
import { requireUser } from "@/lib/requireUser";
import { notifyZoneResidents } from "@/lib/notify";
import { describeSchedule, sortByWeekday } from "@/lib/schedule";
import {
  ScheduleFieldsSchema,
  WINDOW_ERROR,
  duplicateMessage,
  findDuplicate,
  windowIsValid,
} from "@/lib/scheduleValidation";

const CreateScheduleSchema = ScheduleFieldsSchema.extend({
  // true = publish immediately (residents notified); false = save as draft.
  publish: z.boolean().optional().default(true),
}).refine(windowIsValid, WINDOW_ERROR);

// GET /api/schedules — resident sees only PUBLISHED schedules for their
// zone; admin sees everything (drafts included), optionally ?zone=.
export async function GET(request) {
  const session = requireUser(["resident", "admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    let query = {};
    if (session.role === "resident") {
      const user = await User.findById(session.sub);
      // $ne rather than "published": schedules created before the status
      // field existed have no value stored and count as published.
      query = { zone: user?.zone || "__none__", status: { $ne: "draft" } };
    } else {
      const zone = new URL(request.url).searchParams.get("zone");
      if (zone) query.zone = zone;
    }

    const schedules = await Schedule.find(query).lean();
    return NextResponse.json({ schedules: sortByWeekday(schedules) });
  } catch (err) {
    console.error("GET /api/schedules error:", err);
    return NextResponse.json({ error: "Could not load schedules" }, { status: 500 });
  }
}

// POST /api/schedules — admin creates a schedule for a zone, either as a
// draft or published straight away (CPT-38). Publishing notifies every
// resident in that zone (CPT-40).
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { publish, ...fields } = parsed.data;

  await dbConnect();

  try {
    if (!(await Zone.exists({ name: fields.zone }))) {
      return NextResponse.json({ error: "Select a valid zone" }, { status: 400 });
    }
    if (await findDuplicate(fields)) {
      return NextResponse.json(
        { error: duplicateMessage(fields) },
        { status: 409 }
      );
    }

    const schedule = await Schedule.create({
      ...fields,
      status: publish ? "published" : "draft",
      publishedAt: publish ? new Date() : null,
      createdBy: session.sub,
    });

    let notified = 0;
    if (publish) {
      notified = await notifyZoneResidents(schedule.zone, {
        type: "schedule_published",
        title: `New collection schedule for ${schedule.zone}`,
        message: describeSchedule(schedule),
      });
    }

    return NextResponse.json({ schedule, notified }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/schedules error:", err);
    return NextResponse.json({ error: "Could not create schedule" }, { status: 500 });
  }
}
