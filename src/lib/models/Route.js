import mongoose from "mongoose";

const StopSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

// CPT-44: every admin edit leaves a line here, so ops can see what changed
// on a route after crews were already told about it.
const ChangeSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const RouteSchema = new mongoose.Schema(
  {
    zone: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    // Lead crew member (driver). Kept as `assignedTo` so existing queries
    // and the seed script keep working.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // CPT-39 Team & Vehicle Allocation: the rest of the crew on board, and
    // the truck (a Resource with category "truck") they're using.
    crew: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", default: null },
    stops: { type: [StopSchema], default: [] },
    // CPT-37 / CPT-43: set when the crew starts the route (explicitly, or
    // implicitly by completing the first stop) and when the last stop is
    // done. Drive the residents' truck alerts and the progress board.
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    changeLog: { type: [ChangeSchema], default: [] },
  },
  { timestamps: true }
);

RouteSchema.index({ date: 1 });
RouteSchema.index({ assignedTo: 1, date: 1 });

export default mongoose.models.Route || mongoose.model("Route", RouteSchema);
