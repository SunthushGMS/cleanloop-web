import mongoose from "mongoose";
import { DAYS, WASTE_TYPES } from "@/lib/schedule";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const ScheduleSchema = new mongoose.Schema(
  {
    zone: { type: String, required: true, trim: true },
    dayOfWeek: { type: String, enum: DAYS, required: true },
    wasteType: { type: String, enum: WASTE_TYPES, default: "general" },
    // Optional collection window, "HH:MM" 24h (CPT-38).
    startTime: { type: String, match: TIME, default: "" },
    endTime: { type: String, match: TIME, default: "" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    // CPT-38: admins can stage a schedule as a draft and publish it when
    // ready. Residents only ever see "published". Defaults to published
    // so schedules created before this field existed stay visible.
    status: { type: String, enum: ["draft", "published"], default: "published" },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ScheduleSchema.index({ zone: 1, status: 1 });

export default mongoose.models.Schedule ||
  mongoose.model("Schedule", ScheduleSchema);
