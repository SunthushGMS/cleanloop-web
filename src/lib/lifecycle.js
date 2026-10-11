import {
  DEFAULT_USEFUL_LIFE_YEARS,
  DEFAULT_SALVAGE_RATE,
  ASSESSMENT,
} from "@/lib/lifecycleConstants";

const YEAR_MS = 365.25 * 86400000;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Book value of a resource as of `asOf`.
 * Needs purchaseCost and purchaseDate; otherwise returns { complete: false }.
 */
export function depreciation(resource, asOf = new Date()) {
  const cost = resource.purchaseCost;
  const missing = [];
  if (cost === null || cost === undefined) missing.push("purchase cost");
  if (!resource.purchaseDate) missing.push("purchase date");
  if (missing.length) return { complete: false, missing };

  const usefulLife = resource.usefulLifeYears || DEFAULT_USEFUL_LIFE_YEARS[resource.category] || 5;
  const rawSalvage =
    resource.salvageValue ?? round2(cost * DEFAULT_SALVAGE_RATE);
  const salvage = Math.min(cost, Math.max(0, rawSalvage));
  const method = resource.depreciationMethod || "straight_line";

  const ageYears = Math.max(0, (new Date(asOf) - new Date(resource.purchaseDate)) / YEAR_MS);
  const fullyDepreciated = ageYears >= usefulLife;

  let book;
  if (fullyDepreciated) {
    book = salvage;
  } else if (method === "declining_balance") {
    book = Math.max(salvage, cost * Math.pow(1 - 2 / usefulLife, ageYears));
  } else {
    book = cost - ((cost - salvage) / usefulLife) * ageYears;
  }
  book = round2(Math.min(cost, Math.max(salvage, book)));

  return {
    complete: true,
    cost,
    salvage: round2(salvage),
    usefulLife,
    method,
    ageYears: round2(ageYears),
    accumulated: round2(cost - book),
    bookValue: book,
    percentDepreciated: cost > 0 ? Math.round(((cost - book) / cost) * 100) : 0,
    fullyDepreciated,
    usingDefaults: {
      usefulLife: !resource.usefulLifeYears,
      salvage: resource.salvageValue === null || resource.salvageValue === undefined,
    },
  };
}

/**
 * Replacement assessment from four simple signals.
 * 0 signals = ok, 1 = watch, 2+ = replace.
 */
export function assessReplacement({ resource, dep, breakdowns12m, maintenanceCost }) {
  const reasons = [];

  if (dep.complete && dep.fullyDepreciated) reasons.push("Past its useful life");
  if (breakdowns12m >= ASSESSMENT.BREAKDOWNS_12M) {
    reasons.push(`${breakdowns12m} breakdowns in the last 12 months`);
  }
  if (
    dep.complete &&
    dep.cost > 0 &&
    maintenanceCost >= dep.cost * ASSESSMENT.MAINTENANCE_COST_RATIO
  ) {
    reasons.push(
      `Repair spend is over ${Math.round(ASSESSMENT.MAINTENANCE_COST_RATIO * 100)}% of purchase cost`
    );
  }
  if (resource.condition === "poor") reasons.push("Condition is poor");

  const level = reasons.length >= 2 ? "replace" : reasons.length === 1 ? "watch" : "ok";
  return { level, reasons };
}