const DAY = 86400000;

// Change these two numbers to change what counts as under/over-used.
export const UNDERUSED_BELOW = 30; // percent
export const OVERUSED_ABOVE = 90; // percent

// Flags need at least this many days of history, so a resource added
// yesterday isn't reported as "100% overused".
const MIN_DAYS_FOR_FLAG = 7;

// Allocation.date is a date-only value stored as UTC midnight.
const utcDayIdx = (d) => Math.floor(new Date(d).getTime() / DAY);

// Timestamps (reportedAt, completedAt, ...) are real instants: use the server's local day.
const localDayIdx = (d) => {
  const t = new Date(d);
  return Math.floor((t.getTime() - t.getTimezoneOffset() * 60000) / DAY);
};

function shiftHours(allocation) {
  if (!allocation.shiftStart || !allocation.shiftEnd) return 0;
  const [sh, sm] = allocation.shiftStart.split(":").map(Number);
  const [eh, em] = allocation.shiftEnd.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

// The period a resource was out of service because of a record, or null.
function downtimeInterval(record, now) {
  const end =
    record.status === "completed"
      ? record.completedAt
      : record.status === "cancelled"
      ? record.updatedAt
      : now;

  if (record.type === "breakdown") {
    return [record.reportedAt || record.createdAt, end || now];
  }
  // Preventive work only counts as downtime once it has started.
  if (!record.startedAt) return null;
  return [record.startedAt, end || now];
}

function groupBy(items, keyFn) {
  const groups = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export function buildUtilization({ resources, allocations, records, days, now = new Date() }) {
  const endIdx = localDayIdx(now);
  const startIdx = endIdx - (days - 1);

  const allocationsBy = groupBy(allocations, (a) => String(a.resource));
  const recordsBy = groupBy(records, (r) => String(r.resource));

  const rows = resources.map((resource) => {
    const id = String(resource._id);

    // Count days from when the resource was added, if that is inside the period.
    const firstIdx = Math.max(startIdx, localDayIdx(resource.createdAt));
    const windowDays = Math.max(0, endIdx - firstIdx + 1);

    const usedDays = new Set();
    let trips = 0;
    let hours = 0;
    for (const a of allocationsBy[id] || []) {
      const idx = utcDayIdx(a.date);
      if (idx < startIdx || idx > endIdx) continue;
      usedDays.add(idx);
      trips += 1;
      hours += shiftHours(a);
    }

    const downDays = new Set();
    for (const record of recordsBy[id] || []) {
      const interval = downtimeInterval(record, now);
      if (!interval) continue;
      const from = Math.max(localDayIdx(interval[0]), firstIdx);
      const to = Math.min(localDayIdx(interval[1]), endIdx);
      for (let i = from; i <= to; i++) downDays.add(i);
    }

    const availableDays = windowDays - downDays.size;
    const utilization =
      availableDays > 0 ? Math.min(100, Math.round((usedDays.size / availableDays) * 100)) : null;

    let flag = null;
    if (utilization !== null && windowDays >= MIN_DAYS_FOR_FLAG) {
      flag =
        utilization < UNDERUSED_BELOW
          ? "underused"
          : utilization > OVERUSED_ABOVE
          ? "overused"
          : "normal";
    }

    return {
      id,
      name: resource.name,
      category: resource.category,
      registrationNumber: resource.registrationNumber || "",
      status: resource.status,
      trips,
      daysUsed: usedDays.size,
      hours: Math.round(hours * 10) / 10,
      downtimeDays: downDays.size,
      availableDays,
      windowDays,
      utilization,
      flag,
    };
  });

  // Highest utilization first, resources without a value last.
  rows.sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1));
  return rows;
}