import { z } from "zod";
import { FUEL_TYPE_VALUES } from "@/lib/fuelConstants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// "" from an empty <select> becomes null; a missing key stays undefined.
const optionalId = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.null(), objectId]).optional()
);

export const CreateFuelSchema = z
  .object({
    resourceId: objectId,
    date: z.coerce.date({ errorMap: () => ({ message: "Choose a date" }) }),
    fuelType: z.enum(FUEL_TYPE_VALUES),
    litres: z
      .number({ invalid_type_error: "Enter the litres" })
      .positive("Litres must be greater than 0")
      .max(5000, "That looks too high"),
    cost: z.number().min(0, "Cost cannot be negative").nullable().optional(),
    odometer: z.number().min(0, "Odometer cannot be negative").nullable().optional(),
    driverId: optionalId,
    notes: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.date.getTime() <= Date.now() + 86400000, {
    message: "Date cannot be in the future",
    path: ["date"],
  });