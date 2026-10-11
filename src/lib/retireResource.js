import Resource from "@/lib/models/Resource";
import RetirementRecord from "@/lib/models/RetirementRecord";
import MaintenanceRecord from "@/lib/models/MaintenanceRecord";
import { depreciation } from "@/lib/lifecycle";
import { OPEN_STATUSES } from "@/lib/maintenanceConstants";

export class LifecycleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Retires a resource: status -> retired, creates the RetirementRecord and
 * cancels any open maintenance jobs. Rolls the status back if anything fails.
 * Throws LifecycleError for expected problems (not found / in use / already retired).
 */
export async function retireResource({ resourceId, reason, retiredAt, userId }) {
  const date = retiredAt || new Date();

  // Atomic: only succeeds if the resource is neither retired nor currently in use.
  const previous = await Resource.findOneAndUpdate(
    { _id: resourceId, status: { $nin: ["retired", "in_use"] } },
    { $set: { status: "retired", assignedTo: null } },
    { new: false } // returns the document as it was BEFORE the update
  );

  if (!previous) {
    const current = await Resource.findById(resourceId).select("status").lean();
    if (!current) throw new LifecycleError("Resource not found", 404);
    if (current.status === "retired") {
      throw new LifecycleError(
        "This resource is already retired. If it has no retirement record, set its status back to Available first.",
        409
      );
    }
    throw new LifecycleError(
      "This resource is currently in use. Release its allocation before retiring it.",
      409
    );
  }

  try {
    const dep = depreciation(previous, date);
    const record = await RetirementRecord.create({
      resource: resourceId,
      retiredAt: date,
      reason,
      conditionAtRetirement: previous.condition,
      bookValueAtRetirement: dep.complete ? dep.bookValue : null,
      retiredBy: userId || null,
    });

    // Open repair / service jobs make no sense for a retired resource.
    await MaintenanceRecord.updateMany(
      { resource: resourceId, status: { $in: OPEN_STATUSES } },
      { $set: { status: "cancelled", resolution: "Cancelled automatically: resource retired" } }
    );

    return record;
  } catch (err) {
    await Resource.updateOne(
      { _id: resourceId },
      { $set: { status: previous.status, assignedTo: previous.assignedTo } }
    );
    throw err;
  }
}