import mongoose from "mongoose";
import { REQUEST_STATUSES } from "@/lib/spotConstants";

// One optional photo, resized in the browser before upload. Stored here rather
// than in an external service so the team needs no extra accounts or keys.
const PhotoSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * SpotRequest
 * ----------------------------------------------------------------------
 * A volunteer's proposal for a recurring dumping spot. An admin reviews it:
 * approve (creates a Spot), merge into an existing Spot (duplicates), or
 * reject with a reason. The volunteer can withdraw it while pending.
 */
const SpotRequestSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    landmark: { type: String, required: true, trim: true, maxlength: 120 },
    street: { type: String, trim: true, maxlength: 160, default: "" },
    zone: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    // "I'll adopt it if approved" — the reporter gets first claim.
    wantsToAdopt: { type: Boolean, default: false },

    // select:false (same idea as User.passwordHash): normal queries never load
    // the image bytes; only the photo endpoint asks for them explicitly.
    photo: { type: PhotoSchema, select: false, default: null },
    // Lets lists show "has a photo" without loading it.
    hasPhoto: { type: Boolean, default: false },

    status: { type: String, enum: REQUEST_STATUSES, default: "pending" },
    rejectReason: { type: String, trim: true, maxlength: 300, default: "" },
    // The Spot this request became (approved) or was merged into.
    spot: { type: mongoose.Schema.Types.ObjectId, ref: "Spot", default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SpotRequestSchema.index({ status: 1, createdAt: 1 });
SpotRequestSchema.index({ reporter: 1, createdAt: -1 });

export default mongoose.models.SpotRequest ||
  mongoose.model("SpotRequest", SpotRequestSchema);
