import { z } from "zod";
import { DISPOSAL_METHOD_VALUES } from "@/lib/lifecycleConstants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const text = (max) => z.string().trim().max(max);

const optionalId = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.null(), objectId]).optional()
);

// "" from an empty date input becomes null.
const dateOrNull = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.null(), z.coerce.date()])
);

// --- Replacement requests ---------------------------------------------------

export const CreateReplacementSchema = z.object({
  resourceId: objectId,
  reason: text(500).min(3, "Give a reason (at least 3 characters)"),
  estimatedCost: z.number().min(0, "Cost cannot be negative").nullable().optional(),
});

export const ReplacementTransitionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), note: text(300).optional() }),
  z.object({ action: z.literal("reject"), note: text(300).optional() }),
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("complete"),
    replacementResourceId: optionalId,
    replacedAt: dateOrNull.optional(),
    retireOld: z.boolean().optional(),
  }),
]);

// --- Retirement & disposal ---------------------------------------------------

export const CreateRetirementSchema = z.object({
  resourceId: objectId,
  reason: text(500).min(3, "Give a reason (at least 3 characters)"),
  retiredAt: dateOrNull.optional(),
});

export const RetirementTransitionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reinstate") }),
  z.object({
    action: z.literal("dispose"),
    disposalMethod: z.enum(DISPOSAL_METHOD_VALUES),
    disposalDate: z.coerce.date({ errorMap: () => ({ message: "Choose the disposal date" }) }),
    disposalValue: z.number().min(0, "Value cannot be negative").nullable().optional(),
    disposalReference: text(100).optional(),
    notes: text(300).optional(),
  }),
]);