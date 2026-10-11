import mongoose from "mongoose";
import { REPLACEMENT_STATUS_VALUES } from "@/lib/lifecycleConstants";

/** ReplacementRequest: pending -> approved -> completed (or rejected / cancelled). */
const ReplacementRequestSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    estimatedCost: { type: Number, min: [0, "Cost cannot be negative"], default: null },
    status: { type: String, enum: REPLACEMENT_STATUS_VALUES, default: "pending" },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, maxlength: 300, default: "" },

    // Filled in when the replacement is completed.
    replacementResource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", default: null },
    replacedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ReplacementRequestSchema.index({ resource: 1, status: 1 });
ReplacementRequestSchema.index({ createdAt: -1 });

export default mongoose.models.ReplacementRequest ||
  mongoose.model("ReplacementRequest", ReplacementRequestSchema);