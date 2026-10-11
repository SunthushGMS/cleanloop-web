import mongoose from "mongoose";
import { CHECKIN_CONDITIONS } from "@/lib/spotConstants";

/**
 * CheckIn
 * ----------------------------------------------------------------------
 * One visit by the adopting volunteer. Kept in its own collection (not an
 * array on Spot) because the history grows indefinitely — a check-in every
 * week or two, per spot, for months.
 */
const CheckInSchema = new mongoose.Schema(
  {
    spot: { type: mongoose.Schema.Types.ObjectId, ref: "Spot", required: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    condition: { type: String, enum: CHECKIN_CONDITIONS, required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    // Local calendar day ("YYYY-MM-DD", APP_TIME_ZONE). The unique index below
    // allows one check-in per spot per day, even if two requests race.
    day: { type: String, required: true },
  },
  { timestamps: true }
);

CheckInSchema.index({ spot: 1, day: 1 }, { unique: true });
CheckInSchema.index({ spot: 1, createdAt: -1 });

export default mongoose.models.CheckIn || mongoose.model("CheckIn", CheckInSchema);
