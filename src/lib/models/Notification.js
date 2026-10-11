import mongoose from "mongoose";

/**
 * Notification
 * ----------------------------------------------------------------------
 * CPT-28 Notification Infrastructure. One document per recipient, so
 * read/unread state is per user. Producers never create these directly —
 * they go through src/lib/notify.js, which handles fan-out (e.g. "every
 * resident in Ward 4") and keeps the `type` vocabulary in one place.
 */
export const NOTIFICATION_TYPES = [
  "schedule_published",
  "schedule_changed",
  "schedule_cancelled",
  "route_assigned",
  "route_changed",
  "route_cancelled",
  "truck_en_route",
  "collection_completed",
  "system",
];

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, trim: true, maxlength: 500, default: "" },
    // In-app path the bell links to, e.g. "/resident" or "/employee".
    link: { type: String, trim: true, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, readAt: 1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
