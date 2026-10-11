import mongoose from "mongoose";

/**
 * Zone
 * ----------------------------------------------------------------------
 * The single source of truth for zone/ward names across the app. Before
 * this model existed, "zone" was independently free-typed on the
 * registration form, the schedule publisher, the resource form, and the
 * route builder — nothing stopped "Ward 4", "ward 4", and "Ward  4" from
 * existing as three unrelated strings.
 *
 * `stops` is a zone's list of known, reusable collection-stop addresses.
 * Admin populates this once per zone; the route builder then lets ops
 * pick a route's stops from THIS list via dropdown, instead of re-typing
 * (and re-typo-ing) an address every time a route is built.
 *
 * DECISION (documented per project convention): other models still store
 * zone as a plain string (User.zone, Resource.zone, Schedule.zone,
 * Route.zone) rather than an ObjectId ref to this collection. That keeps
 * this a UI-layer constraint (only real zone names are selectable) without
 * a breaking migration across four existing schemas. Trade-off: deleting
 * a Zone does NOT cascade-clean records that already reference its name —
 * see the DELETE handler in src/app/api/zones/[id]/route.js.
 */
const ZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Zone name is required"],
      trim: true,
      unique: true,
    },
    stops: {
      type: [{ type: String, trim: true }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Zone || mongoose.model("Zone", ZoneSchema);