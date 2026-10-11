import mongoose from "mongoose";
import { FUEL_TYPE_VALUES } from "@/lib/fuelConstants";

/** FuelLog — one row per refuelling of a vehicle. */
const FuelLogSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    // Date-only value, stored as UTC midnight of the chosen day.
    date: { type: Date, required: true },
    fuelType: { type: String, enum: FUEL_TYPE_VALUES, default: "diesel" },
    litres: { type: Number, required: true, min: [0.1, "Litres must be greater than 0"] },
    cost: { type: Number, min: [0, "Cost cannot be negative"], default: null },
    // Odometer in km at the time of the fill.
    odometer: { type: Number, min: [0, "Odometer cannot be negative"], default: null },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

FuelLogSchema.index({ resource: 1, date: -1 });
FuelLogSchema.index({ date: -1 });

export default mongoose.models.FuelLog || mongoose.model("FuelLog", FuelLogSchema);