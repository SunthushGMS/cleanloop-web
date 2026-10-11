import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// "" from an empty <select> becomes null; a missing key stays undefined.
const optionalId = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.null(), objectId]).optional()
);

// "" (no shift) or a 24-hour HH:MM time.
const time = z
  .string()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

export const CreateAllocationSchema = z
  .object({
    resourceId: objectId,
    routeId: optionalId,
    driverId: optionalId,
    date: z.coerce.date({ errorMap: () => ({ message: "Choose a date" }) }),
    shiftStart: time.optional(),
    shiftEnd: time.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((d) => !d.shiftStart || !d.shiftEnd || d.shiftEnd > d.shiftStart, {
    message: "Shift end must be after shift start",
    path: ["shiftEnd"],
  });