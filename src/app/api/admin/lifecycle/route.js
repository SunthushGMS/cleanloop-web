import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Resource from "@/lib/models/Resource";
import MaintenanceRecord from "@/lib/models/MaintenanceRecord";
import ReplacementRequest from "@/lib/models/ReplacementRequest";
import { requireUser } from "@/lib/requireUser";
import { depreciation, assessReplacement } from "@/lib/lifecycle";
import { OPEN_REPLACEMENT_STATUSES } from "@/lib/lifecycleConstants";

const LEVEL_ORDER = { replace: 0, watch: 1, ok: 2 };

/**
 * GET /api/admin/lifecycle
 * Depreciation + replacement assessment for every non-retired resource.
 */
export async function GET() {
  const session = requireUser(["admin"]);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  try {
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 86400000);

    const [resources, breakdownAgg, costAgg, openRequests] = await Promise.all([
      Resource.find({ status: { $ne: "retired" } })
        .select(
          "name category registrationNumber status condition purchaseDate purchaseCost usefulLifeYears salvageValue depreciationMethod"
        )
        .lean(),
      MaintenanceRecord.aggregate([
        { $match: { type: "breakdown", status: { $ne: "cancelled" }, reportedAt: { $gte: yearAgo } } },
        { $group: { _id: "$resource", count: { $sum: 1 } } },
      ]),
      MaintenanceRecord.aggregate([
        { $match: { status: "completed", cost: { $ne: null } } },
        { $group: { _id: "$resource", total: { $sum: "$cost" } } },
      ]),
      ReplacementRequest.find({ status: { $in: OPEN_REPLACEMENT_STATUSES } })
        .select("resource status")
        .lean(),
    ]);

    const breakdowns = Object.fromEntries(breakdownAgg.map((x) => [String(x._id), x.count]));
    const repairCost = Object.fromEntries(costAgg.map((x) => [String(x._id), x.total]));
    const requests = Object.fromEntries(openRequests.map((x) => [String(x.resource), x.status]));

    const rows = resources.map((resource) => {
      const id = String(resource._id);
      const dep = depreciation(resource, now);
      const breakdowns12m = breakdowns[id] || 0;
      const maintenanceCost = repairCost[id] || 0;

      return {
        id,
        name: resource.name,
        category: resource.category,
        registrationNumber: resource.registrationNumber || "",
        status: resource.status,
        condition: resource.condition,
        purchaseDate: resource.purchaseDate,
        purchaseCost: resource.purchaseCost,
        settings: {
          usefulLifeYears: resource.usefulLifeYears ?? null,
          salvageValue: resource.salvageValue ?? null,
          depreciationMethod: resource.depreciationMethod || "",
        },
        depreciation: dep,
        breakdowns12m,
        maintenanceCost,
        assessment: assessReplacement({ resource, dep, breakdowns12m, maintenanceCost }),
        openRequest: requests[id] || null,
      };
    });

    rows.sort(
      (a, b) =>
        LEVEL_ORDER[a.assessment.level] - LEVEL_ORDER[b.assessment.level] ||
        a.name.localeCompare(b.name)
    );

    const complete = rows.filter((r) => r.depreciation.complete);
    const summary = {
      assetsValued: complete.length,
      totalCost: complete.reduce((sum, r) => sum + r.depreciation.cost, 0),
      totalBookValue: complete.reduce((sum, r) => sum + r.depreciation.bookValue, 0),
      totalAccumulated: complete.reduce((sum, r) => sum + r.depreciation.accumulated, 0),
      needReplacement: rows.filter((r) => r.assessment.level === "replace").length,
    };

    return NextResponse.json({ rows, summary });
  } catch (err) {
    console.error("GET /api/admin/lifecycle error:", err);
    return NextResponse.json({ error: "Could not load lifecycle data" }, { status: 500 });
  }
}