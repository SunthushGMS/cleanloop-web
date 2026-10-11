import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Resource from "@/lib/models/Resource";
import { requireUser } from "@/lib/requireUser";
import { CreateResourceSchema } from "@/lib/validators/resource";

/**
 * GET /api/admin/resources
 * Optional query params: ?category=truck&status=active&q=search+text
 */
export async function GET(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const condition = searchParams.get("condition");
  const q = searchParams.get("q");

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (condition) filter.condition = condition;
  if (q) {
    // Escape regex special characters so user input is treated as plain text.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { identifier: { $regex: safe, $options: "i" } },
      { registrationNumber: { $regex: safe, $options: "i" } },
    ];
  }

  try {
    const resources = await Resource.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ resources });
  } catch (err) {
    console.error("GET /api/admin/resources error:", err);
    return NextResponse.json({ error: "Could not load resources" }, { status: 500 });
  }
}

/**
 * POST /api/admin/resources
 * Body: see CreateResourceSchema in src/lib/validators/resource.js
 */
export async function POST(request) {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();

  try {
    const resource = await Resource.create({
      ...parsed.data,
      createdBy: session.sub, // from the JWT, never from the client
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    if (err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/admin/resources error:", err);
    return NextResponse.json({ error: "Could not create resource" }, { status: 500 });
  }
}