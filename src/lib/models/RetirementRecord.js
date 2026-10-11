import mongoose from "mongoose";
import { DISPOSAL_METHOD_VALUES } from "@/lib/lifecycleConstants";

/**
 * RetirementRecord: one per retired resource.
 * status "retired" = out of service, awaiting disposal; "disposed" = gone.
 * (Resource.status stays "retired" in both cases.)
 */
const RetirementRecordSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    retiredAt: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    conditionAtRetirement: { type: String, default: "" },
    bookValueAtRetirement: { type: Number, default: null },
    status: { type: String, enum: ["retired", "disposed"], default: "retired" },

    disposalMethod: { type: String, enum: [...DISPOSAL_METHOD_VALUES, ""], default: "" },
    disposalDate: { type: Date, default: null },
    disposalValue: { type: Number, min: [0, "Value cannot be negative"], default: null },
    // Approval / documentation reference number (no file upload in this project).
    disposalReference: { type: String, trim: true, maxlength: 100, default: "" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },

    retiredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// A resource has at most one retirement record.
RetirementRecordSchema.index({ resource: 1 }, { unique: true });
RetirementRecordSchema.index({ status: 1, retiredAt: -1 });

export default mongoose.models.RetirementRecord ||
  mongoose.model("RetirementRecord", RetirementRecordSchema);