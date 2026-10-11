import mongoose from "mongoose";
import { TYPE_VALUES, RECORD_STATUS_VALUES } from "@/lib/maintenanceConstants";

/**
 * MaintenanceRecord — one row per breakdown or preventive-maintenance job.
 * Lifecycle: breakdown  reported -> in_progress -> completed | cancelled
 *            preventive scheduled -> in_progress -> completed | cancelled
 */
const MaintenanceRecordSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    type: { type: String, enum: TYPE_VALUES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: RECORD_STATUS_VALUES, required: true },

    reportedAt: { type: Date, default: Date.now },
    scheduledFor: { type: Date, default: null },
    estimatedCompletion: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // Mechanic / workshop responsible (free text).
    repairedBy: { type: String, trim: true, default: "" },
    cost: { type: Number, min: [0, "Cost cannot be negative"], default: null },
    resolution: { type: String, trim: true, maxlength: 1000, default: "" },

    // Breakdown only: the allocation that was cut short, and its replacement.
    interruptedAllocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", default: null },
    replacementResource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", default: null },
    replacementAllocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

MaintenanceRecordSchema.index({ resource: 1, status: 1 });
MaintenanceRecordSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.MaintenanceRecord ||
  mongoose.model("MaintenanceRecord", MaintenanceRecordSchema);