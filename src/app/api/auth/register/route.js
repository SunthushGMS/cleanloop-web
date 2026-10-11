import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import User, { ROLE_VALUES } from "@/lib/models/User";
import Zone from "@/lib/models/Zone";
import { hashPassword, signToken, buildAuthCookie } from "@/lib/auth";

const PUBLIC_ROLES = ROLE_VALUES.filter((r) => r !== "admin");

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  // Minimum 8 chars, at least one letter and one number — deliberately not
  // requiring symbols, which pushes users toward predictable substitutions.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
  // Admin is deliberately NOT self-service: anyone could otherwise
  // register straight into the operations dashboard. Admin accounts are
  // provisioned via scripts/seed.js (or promoted directly in the DB).
  role: z.enum(PUBLIC_ROLES).default("resident"),
  zone: z.string().trim().max(80).optional().nullable(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role, zone } = parsed.data;
    await dbConnect();

    // Residents' zone scopes their schedule, alerts, and progress view, so
    // it must be a real admin-managed zone — not just whatever the client
    // sent (the dropdown alone doesn't enforce that).
    if (role === "resident") {
      if (!zone || !(await Zone.exists({ name: zone }))) {
        return NextResponse.json(
          { error: "Invalid input", details: { zone: ["Select a valid zone / ward"] } },
          { status: 400 }
        );
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      // Deliberately generic message — avoids confirming which emails exist.
      return NextResponse.json(
        { error: "Could not create account with the provided details." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      zone: role === "resident" ? zone : null,
    });

    const token = signToken({ sub: user._id.toString(), role: user.role });
    const res = NextResponse.json({ user: user.toSafeJSON() }, { status: 201 });
    const cookie = buildAuthCookie(token);
    res.cookies.set(cookie.name, cookie.value, cookie);
    return res;
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
