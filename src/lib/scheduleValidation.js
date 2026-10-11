import { z } from "zod";
import Schedule from "@/lib/models/Schedule";
import { DAYS, WASTE_TYPES } from "@/lib/schedule";

/**
 * Server-side schedule validation shared by POST /api/schedules and
 * PATCH /api/schedules/:id. Kept out of src/lib/schedule.js because that
 * file is also imported by client components and must stay DB-free.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const OptionalTime = z
  .union([z.literal(""), z.string().regex(TIME, "Use HH:MM")])
  .optional()
  .default("");

export const ScheduleFieldsSchema = z.object({
  zone: z.string().trim().min(1).max(80),
  dayOfWeek: z.enum(DAYS),
  wasteType: z.enum(WASTE_TYPES).default("general"),
  startTime: OptionalTime,
  endTime: OptionalTime,
  notes: z.string().trim().max(300).optional().default(""),
});

export function windowIsValid({ startTime, endTime }) {
  return !(startTime && endTime && startTime >= endTime);
}

export const WINDOW_ERROR = { message: "End time must be after start time", path: ["endTime"] };

/**
 * Same zone + day + waste type twice would show residents a duplicated
 * row. Returns the clashing schedule, if any. `excludeId` skips the
 * schedule being edited.
 */
export async function findDuplicate({ zone, dayOfWeek, wasteType }, excludeId = null) {
  const query = { zone, dayOfWeek, wasteType };
  if (excludeId) query._id = { $ne: excludeId };
  return Schedule.findOne(query).lean();
}

export function duplicateMessage({ zone, dayOfWeek, wasteType }) {
  return `${zone} already has a ${wasteType} collection on ${dayOfWeek}. Edit that one instead.`;
}
