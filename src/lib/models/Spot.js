import mongoose from "mongoose";
import { CHECKIN_CONDITIONS, normalizeZone } from "@/lib/spotConstants";

// Copy of the most recent check-in, kept on the spot so the admin table and
// the "stale" highlight don't need to query the CheckIn history.
const LastCheckInSchema = new mongoose.Schema(
  {
    condition: { type: String, enum: CHECKIN_CONDITIONS, required: true },
    note: { type: String, default: "" },
    at: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

/**
 * Spot
 * ----------------------------------------------------------------------
 * A recurring dumping place that one volunteer can adopt and check on.
 * "Adopted" is derived from `adopter` rather than stored as a separate
 * status, so the two can never disagree. Created by an admin approving a
 * SpotRequest (or directly by an admin).
 */
const SpotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    street: { type: String, trim: true, maxlength: 160, default: "" },
    zone: { type: String, required: true, trim: true, maxlength: 80 },
    // Lower-cased, single-spaced zone — matches "Ward 4" with "ward  4" when
    // suggesting duplicates. Set automatically from `zone`.
    zoneKey: { type: String, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: "" },

    adopter: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adoptedAt: { type: Date, default: null },
    lastCheckIn: { type: LastCheckInSchema, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // The request this spot was created from, if any (for its photo/history).
    sourceRequest: { type: mongoose.Schema.Types.ObjectId, ref: "SpotRequest", default: null },
  },
  { timestamps: true }
);

SpotSchema.index({ adopter: 1 });

SpotSchema.pre("validate", function setZoneKey(next) {
  this.zoneKey = normalizeZone(this.zone);
  next();
});

export default mongoose.models.Spot || mongoose.model("Spot", SpotSchema);
