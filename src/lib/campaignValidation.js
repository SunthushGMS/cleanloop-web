import { z } from "zod";
import { isPastCampaignDate } from "@/lib/campaignDates";

// Field rules shared by create (POST /api/campaigns) and edit
// (PATCH /api/campaigns/:id), so the two can't drift apart.
const title = z
  .string()
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(120, "Title must be 120 characters or fewer");

const description = z
  .string()
  .trim()
  .max(1000, "Description must be 1000 characters or fewer");

const zone = z.string().trim().max(80, "Zone must be 80 characters or fewer").nullable();

// "YYYY-MM-DD" from the date input; stored as UTC midnight of that day.
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
  .transform((value) => new Date(value))
  .refine((d) => !Number.isNaN(d.getTime()), "Pick a valid date");

export const PAST_DATE_MESSAGE = "Campaign date can't be in the past";

export const CreateCampaignSchema = z.object({
  title,
  description: description.optional().default(""),
  zone: zone.optional(),
  date: date.refine((d) => !isPastCampaignDate(d), PAST_DATE_MESSAGE),
});

// Every field optional; send only what changed. The past-date rules for edits
// depend on the existing campaign, so the route checks them, not this schema.
export const EditCampaignSchema = z
  .object({ title, description, zone, date })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
