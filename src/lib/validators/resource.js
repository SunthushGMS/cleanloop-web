import { z } from "zod";
import {
  CATEGORY_VALUES,
  STATUS_VALUES,
  CONDITION_VALUES,
} from "@/lib/resourceConstants";
import { METHOD_VALUES } from "@/lib/lifecycleConstants";

const text = (max) => z.string().trim().max(max);

// "" from an empty date input becomes null; otherwise parse as a date.
const dateOrNull = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.null(), z.coerce.date()])
);

const ResourceFields = z.object({
  name: text(120).min(1, "Name is required"),
  category: z.enum(CATEGORY_VALUES),
  identifier: text(60),
  registrationNumber: text(40),
  make: text(60),
  model: text(60),
  purchaseDate: dateOrNull,
  purchaseCost: z.number().min(0, "Cost cannot be negative").nullable(),
  capacity: text(60),
  status: z.enum(STATUS_VALUES),
  condition: z.enum(CONDITION_VALUES),
  quantity: z.number().int().min(0).max(100000),
  zone: text(80),
  operatorName: text(80),
  warranty: text(200),
  lastServicedAt: dateOrNull,
  nextMaintenanceAt: dateOrNull,
  usefulLifeYears: z.number().min(0.5).max(50).nullable(),
  salvageValue: z.number().min(0).nullable(),
  depreciationMethod: z.enum([...METHOD_VALUES, ""]),
  notes: text(1000),
  meta: z.record(z.string().max(200)),
});

// Create: only name and category are required, everything else optional.
export const CreateResourceSchema = ResourceFields.partial().required({
  name: true,
  category: true,
});

// Update: any subset, but at least one field.
export const UpdateResourceSchema = ResourceFields.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Nothing to update" }
);