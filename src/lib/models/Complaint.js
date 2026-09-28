import mongoose from "mongoose";

// Sprint 2 cross-module link: an employee's hazard/issue flag (US-16) and a
// resident's missed-collection report both create a Complaint, which then
// appears on the admin's dashboard queue (US-11).
const ComplaintSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["missed_collection", "illegal_dumping", "hazard", "other"],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    zone: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    source: {
      type: String,
      enum: ["resident", "employee"],
      required: true,
    },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Complaint ||
  mongoose.model("Complaint", ComplaintSchema);
