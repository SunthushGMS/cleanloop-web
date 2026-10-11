import { HIGH_CONSUMPTION_FACTOR } from "@/lib/fuelConstants";

/**
 * Turns "YYYY-MM" into a UTC date range. Falls back to the current month.
 * Fuel dates are stored as UTC midnight of the chosen day, so UTC bounds match.
 */
export function monthRange(input, now = new Date()) {
  let month = input;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    month = local.toISOString().slice(0, 7);
  }
  const [year, mon] = month.split("-").map(Number);
  return {
    month,
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon, 1)),
  };
}

/**
 * Efficiency segments for ONE vehicle. `logs` must be sorted oldest -> newest.
 * Each fill after the first (that has an odometer) gives one segment:
 * distance since the previous odometer reading, using THIS fill's litres.
 * (Assumes each fill tops up the tank.)
 */
export function efficiencySegments(logs) {
  const segments = [];
  let previous = null;
  for (const log of logs) {
    if (log.odometer === null || log.odometer === undefined) continue;
    if (previous) {
      const km = log.odometer - previous.odometer;
      if (km > 0 && log.litres > 0) {
        segments.push({ date: log.date, km, litres: log.litres });
      }
    }
    previous = log;
  }
  return segments;
}

function rate(segments) {
  const km = segments.reduce((sum, s) => sum + s.km, 0);
  const litres = segments.reduce((sum, s) => sum + s.litres, 0);
  return {
    km,
    kmPerL: litres > 0 ? Math.round((km / litres) * 100) / 100 : null,
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Per-vehicle fuel summary for one month.
 * logs: all fuel logs (any order). resourcesById: { id: { name, category, registrationNumber } }
 */
export function buildFuelSummary({ logs, resourcesById, start, end }) {
  const byResource = {};
  for (const log of logs) {
    const id = String(log.resource);
    if (!byResource[id]) byResource[id] = [];
    byResource[id].push(log);
  }

  const inRange = (d) => d >= start && d < end;
  const rows = [];

  for (const [id, list] of Object.entries(byResource)) {
    const resource = resourcesById[id];
    if (!resource) continue; // resource was deleted

    list.sort(
      (a, b) => new Date(a.date) - new Date(b.date) || (a.odometer ?? 0) - (b.odometer ?? 0)
    );

    const monthLogs = list.filter((l) => inRange(l.date));
    if (monthLogs.length === 0) continue;

    const segments = efficiencySegments(list);
    const thisMonth = rate(segments.filter((s) => inRange(s.date)));
    const usual = rate(segments.filter((s) => !inRange(s.date)));

    const costs = monthLogs.filter((l) => l.cost !== null && l.cost !== undefined);

    rows.push({
      id,
      name: resource.name,
      category: resource.category,
      registrationNumber: resource.registrationNumber || "",
      fills: monthLogs.length,
      litres: round1(monthLogs.reduce((sum, l) => sum + l.litres, 0)),
      cost: costs.length ? costs.reduce((sum, l) => sum + l.cost, 0) : null,
      distance: thisMonth.km,
      kmPerL: thisMonth.kmPerL,
      usualKmPerL: usual.kmPerL,
      highConsumption:
        thisMonth.kmPerL !== null &&
        usual.kmPerL !== null &&
        thisMonth.kmPerL < usual.kmPerL * HIGH_CONSUMPTION_FACTOR,
    });
  }

  rows.sort((a, b) => b.litres - a.litres);

  return {
    rows,
    totals: {
      litres: round1(rows.reduce((sum, r) => sum + r.litres, 0)),
      cost: rows.some((r) => r.cost !== null)
        ? rows.reduce((sum, r) => sum + (r.cost || 0), 0)
        : null,
      vehicles: rows.length,
    },
  };
}