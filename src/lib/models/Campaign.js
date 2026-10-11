import mongoose from "mongoose";

// What actually happened at a campaign, recorded by the organizer once the
// date has passed. Turns the campaign list into an impact record.
const OutcomeSchema = new mongoose.Schema(
  {
    bagsCollected: { type: Number, min: 0, default: null },
    kgCollected: { type: Number, min: 0, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    zone: { type: String, trim: true, default: null },
    date: { type: Date, required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendees: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rsvpedAt: { type: Date, default: Date.now },
      },
    ],
    // Cancelled campaigns stay visible (with a "Cancelled" badge) so people who
    // RSVP'd find out, instead of the card silently disappearing. Campaigns
    // created before this field existed have no status — treat missing as
    // "active" (query with { status: { $ne: "cancelled" } }, not "active").
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelledAt: { type: Date, default: null },
    // Set when the organizer changes title/description/zone/date, so
    // attendees can spot that details changed after they RSVP'd.
    editedAt: { type: Date, default: null },
    outcome: { type: OutcomeSchema, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Campaign ||
  mongoose.model("Campaign", CampaignSchema);
