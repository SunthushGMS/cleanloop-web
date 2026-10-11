import { z } from "zod";
import { TYPE_VALUES } from "@/lib/maintenanceConstants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const text = (max) => z.string().trim().max(max);

// "" from an empty date input becomes null.
const dateOrNull = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.null(), z.coerce.date()])
);

export const CreateMaintenanceSchema = z
  .object({
    resourceId: objectId,
    type: z.enum(TYPE_VALUES),
    description: text(500).min(3, "Describe the problem or the work (at least 3 characters)"),
    scheduledFor: dateOrNull.optional(),
    estimatedCompletion: dateOrNull.optional(),
    repairedBy: text(80).optional(),
  })
  .refine((d) => d.type !== "preventive" || d.scheduledFor, {
    message: "Choose the scheduled date",
    path: ["scheduledFor"],
  });

// PATCH body: which transition to apply (+ details for "complete").
export const TransitionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("complete"),
    cost: z.number().min(0, "Cost cannot be negative").nullable().optional(),
    resolution: text(1000).optional(),
    nextServiceDate: dateOrNull.optional(),
  }),
]);

export const ReplaceSchema = z.object({ replacementId: objectId });