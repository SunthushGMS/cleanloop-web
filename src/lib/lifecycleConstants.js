// Shared by models, validators, calculations and UI. No server-only imports.

export const DEPRECIATION_METHOD_OPTIONS = [
  { value: "straight_line", label: "Straight-line" },
  { value: "declining_balance", label: "Declining balance" },
];
export const METHOD_VALUES = DEPRECIATION_METHOD_OPTIONS.map((o) => o.value);
export const METHOD_LABEL = Object.fromEntries(
  DEPRECIATION_METHOD_OPTIONS.map((o) => [o.value, o.label])
);

// Used when a resource has no useful life / salvage value of its own.
export const DEFAULT_USEFUL_LIFE_YEARS = {
  truck: 10,
  tractor: 12,
  lorry: 10,
  compactor: 8,
  weighing: 10,
  bin: 5,
  ppe: 3,
  other: 5,
};
export const DEFAULT_SALVAGE_RATE = 0.1; // 10% of purchase cost

// Thresholds behind the replacement assessment.
export const ASSESSMENT = {
  BREAKDOWNS_12M: 4, // this many breakdowns in the last 12 months
  MAINTENANCE_COST_RATIO: 0.5, // total repair spend as a share of purchase cost
};

export const REPLACEMENT_STATUS_LABEL = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const REPLACEMENT_STATUS_VALUES = Object.keys(REPLACEMENT_STATUS_LABEL);
export const OPEN_REPLACEMENT_STATUSES = ["pending", "approved"];

export const DISPOSAL_METHOD_OPTIONS = [
  { value: "sold", label: "Sold" },
  { value: "scrapped", label: "Scrapped" },
  { value: "donated", label: "Donated" },
  { value: "traded_in", label: "Traded in" },
  { value: "recycled", label: "Recycled" },
];
export const DISPOSAL_METHOD_VALUES = DISPOSAL_METHOD_OPTIONS.map((o) => o.value);
export const DISPOSAL_METHOD_LABEL = Object.fromEntries(
  DISPOSAL_METHOD_OPTIONS.map((o) => [o.value, o.label])
);