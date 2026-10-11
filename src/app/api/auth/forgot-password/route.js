import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

const ForgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Same in-memory throttle shape as the login route: stops this endpoint
// being used to spam reset tokens for one address.
const requests = new Map();
const MAX_REQUESTS = 3;
const WINDOW_MS = 15 * 60 * 1000;

function isThrottled(key) {
  const now = Date.now();
  const record = requests.get(key);
  if (!record || now - record.firstAt > WINDOW_MS) {
    requests.set(key, { count: 1, firstAt: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_REQUESTS;
}

const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

/**
 * POST /api/auth/forgot-password   Body: { email }
 * ---------------------------------------------------------------------
 * CPT-27. Always answers with the same generic message, whether or not
 * the email is registered, so this can't be used to enumerate accounts
 * (same principle as the login route's generic error).
 *
 * DELIVERY: there's no email provider configured in this project yet,
 * so the reset link is written to the server log. Outside production it
 * is ALSO returned as `devResetUrl` so the flow can be demoed end to end
 * at Sprint Review. Swap the console.log for a mail send (e.g. Resend /
 * SendGrid) before any real deployment — production never returns it.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ForgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  if (isThrottled(email)) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again in a few minutes." },
      { status: 429 }
    );
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const resetUrl = `${new URL(request.url).origin}/reset-password?token=${token}`;
    console.log(`[password reset] ${email}: ${resetUrl}`);

    return NextResponse.json({
      ok: true,
      message: GENERIC_MESSAGE,
      ...(process.env.NODE_ENV !== "production" && { devResetUrl: resetUrl }),
    });
  } catch (err) {
    console.error("POST /api/auth/forgot-password error:", err);
    return NextResponse.json({ error: "Could not process request" }, { status: 500 });
  }
}
