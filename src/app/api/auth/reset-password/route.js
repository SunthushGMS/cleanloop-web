import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/auth";

// Same complexity rule as registration and change-password.
const ResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired reset link"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
});

/**
 * POST /api/auth/reset-password   Body: { token, newPassword }
 * CPT-27. Single-use: the token hash is cleared on success, so a reset
 * link can't be replayed. Does not log the user in — they're sent back
 * to /login, which also proves the new password works.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");

  try {
    await dbConnect();
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    user.passwordHash = await hashPassword(parsed.data.newPassword);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/reset-password error:", err);
    return NextResponse.json({ error: "Could not reset password" }, { status: 500 });
  }
}
