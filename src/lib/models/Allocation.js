import mongoose from "mongoose";

/**
 * Allocation — one row per "resource X was assigned to route/driver Y".
 * status "active" = the resource is out on assignment; "released" = history.
 * The Route and Resource models are referenced, never modified.
 */
const AllocationSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    date: { type: Date, required: true },
    // "HH:MM" 24-hour strings, empty when no shift was set.
    shiftStart: { type: String, trim: true, default: "" },
    shiftEnd: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["active", "released"], default: "active" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Safety net: a resource can have at most ONE active allocation.
AllocationSchema.index(
  { resource: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);
AllocationSchema.index({ status: 1, date: -1 });

export default mongoose.models.Allocation ||
  mongoose.model("Allocation", AllocationSchema);