import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Complaint from "@/lib/models/Complaint";
import { requireUser } from "@/lib/requireUser";

const UpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  assignedTo: z.string().nullable().optional(),
  resolutionNotes: z.string().trim().max(1000).optional(),
});

// GET /api/complaints/:id — fetch single complaint details
export async function GET(request, { params }) {
  const session = requireUser(["resident", "employee", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    await dbConnect();
    const complaint = await Complaint.findById(params.id)
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Access check: Admin can view any; resident/employee can view if reporter or assignee
    const isReporter = complaint.reportedBy?._id?.toString() === session.sub;
    const isAssignee = complaint.assignedTo?._id?.toString() === session.sub;
    if (session.role !== "admin" && !isReporter && !isAssignee) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json({ complaint });
  } catch (error) {
    console.error("GET /api/complaints/:id error:", error);
    return NextResponse.json(
      { error: "Could not fetch complaint" },
      { status: 500 }
    );
  }
}

// PATCH /api/complaints/:id — admin updates status/assignment; assigned employee can update status.
export async function PATCH(request, { params }) {
  const session = requireUser(["admin", "employee"]);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await dbConnect();
    const existing = await Complaint.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Authorization: Admin can edit anything. Employee can only edit if assignedTo === session.sub and modifying status.
    if (session.role === "employee") {
      const isAssignee = existing.assignedTo?.toString() === session.sub;
      if (!isAssignee) {
        return NextResponse.json({ error: "Not authorized to update this complaint" }, { status: 403 });
      }
      if (parsed.data.assignedTo !== undefined) {
        return NextResponse.json({ error: "Employees cannot reassign complaints" }, { status: 403 });
      }
    }

    const update = {};
    if (parsed.data.status !== undefined) {
      update.status = parsed.data.status;
      if (parsed.data.status === "resolved") {
        update.resolvedAt = new Date();
      } else if (existing.status === "resolved" && parsed.data.status !== "resolved") {
        update.resolvedAt = null;
      }
    }

    if (parsed.data.assignedTo !== undefined && session.role === "admin") {
      update.assignedTo = parsed.data.assignedTo || null;
    }

    if (parsed.data.resolutionNotes !== undefined) {
      update.resolutionNotes = parsed.data.resolutionNotes;
    }

    const complaint = await Complaint.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role");

    return NextResponse.json({ complaint });
  } catch (error) {
    console.error("PATCH /api/complaints/:id error:", error);
    return NextResponse.json(
      { error: "Could not update complaint" },
      { status: 500 }
    );
  }
}
