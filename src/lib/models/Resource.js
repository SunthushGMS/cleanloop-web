import mongoose from "mongoose";
import {
  CATEGORY_VALUES,
  STATUS_VALUES,
  CONDITION_VALUES,
} from "@/lib/resourceConstants";
import { METHOD_VALUES } from "@/lib/lifecycleConstants";

/**
 * Resource
 * One schema for all vehicles and equipment. Truly category-specific extras
 * (fuel type, PPE size, ...) live in `meta`. Common registration data
 * (registration number, make/model, purchase info) are real fields.
 */
const ResourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: CATEGORY_VALUES,
      required: [true, "Category is required"],
    },
    // Asset tag / serial. Not unique at DB level (some items aren't tagged).
    identifier: { type: String, trim: true, default: "" },
    // Vehicle plate or equipment registration number.
    registrationNumber: { type: String, trim: true, default: "" },
    make: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    purchaseDate: { type: Date, default: null },
    purchaseCost: {
      type: Number,
      min: [0, "Purchase cost cannot be negative"],
      default: null,
    },
    capacity: { type: String, trim: true, default: "" },
    status: { type: String, enum: STATUS_VALUES, default: "active" },
    condition: { type: String, enum: CONDITION_VALUES, default: "good" },
    quantity: {
      type: Number,
      default: 1,
      min: [0, "Quantity cannot be negative"],
    },
    // Location / zone the resource is based in (free text for now).
    zone: { type: String, trim: true, default: "" },
    // Driver / operator name as free text. `assignedTo` below is reserved
    // for the allocation feature (Step 3).
    operatorName: { type: String, trim: true, default: "" },
    warranty: { type: String, trim: true, default: "" },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Set from the session in POST, never accepted from the request body.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastServicedAt: { type: Date, default: null },
    nextMaintenanceAt: { type: Date, default: null },
    // Depreciation settings. Empty = use the category defaults (see lifecycleConstants.js).
    usefulLifeYears: { type: Number, min: [0.5, "Useful life must be at least 0.5 years"], default: null },
    salvageValue: { type: Number, min: [0, "Salvage value cannot be negative"], default: null },
    depreciationMethod: { type: String, enum: [...METHOD_VALUES, ""], default: "" },
    notes: { type: String, trim: true, default: "" },
    meta: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

ResourceSchema.index({ category: 1, status: 1 });
ResourceSchema.index({ name: "text", identifier: "text" });

export default mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);