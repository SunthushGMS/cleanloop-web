import { z } from "zod";
import { CHECKIN_CONDITIONS } from "@/lib/spotConstants";

// Spot fields an admin can set when creating or editing a spot directly.
const name = z.string().trim().min(3, "Name must be at least 3 characters").max(120, "Name must be 120 characters or fewer");
const street = z.string().trim().max(160, "Street must be 160 characters or fewer");
const zone = z.string().trim().min(1, "Zone is required").max(80, "Zone must be 80 characters or fewer");
const description = z.string().trim().max(1000, "Description must be 1000 characters or fewer");

export const CreateSpotSchema = z.object({
  name,
  street: street.default(""),
  zone,
  description: description.default(""),
});

export const EditSpotSchema = z
  .object({ name, street, zone, description })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

export const CheckInSchema = z.object({
  condition: z.enum(CHECKIN_CONDITIONS, {
    errorMap: () => ({ message: "Pick the spot's condition" }),
  }),
  note: z.string().trim().max(500, "Note must be 500 characters or fewer").default(""),
});

/** { error, details } body for a failed zod parse, surfacing whole-body errors. */
export function zodErrorBody(error) {
  const { formErrors, fieldErrors } = error.flatten();
  return { error: formErrors[0] || "Invalid input", details: fieldErrors };
}
