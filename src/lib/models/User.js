import mongoose from "mongoose";

const ROLES = ["resident", "admin", "employee", "volunteer"];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: "resident" },
    // Resident-only: which ward/zone they belong to, used to scope schedules.
    zone: { type: String, trim: true, default: null },
    // Set by PATCH /api/auth/password whenever the password changes. `null`
    // means "never changed since registration" — this is display-only info
    // for the profile page, it doesn't gate auth or invalidate sessions.
    passwordChangedAt: { type: Date, default: null },
    // Forgot-password flow (CPT-27). Only a SHA-256 hash of the reset
    // token is stored, so a DB leak can't be replayed into account
    // takeover. Both fields are select:false like passwordHash.
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

UserSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    zone: this.zone,
    passwordChangedAt: this.passwordChangedAt,
    createdAt: this.createdAt,
  };
};

export const ROLE_VALUES = ROLES;
export default mongoose.models.User || mongoose.model("User", UserSchema);