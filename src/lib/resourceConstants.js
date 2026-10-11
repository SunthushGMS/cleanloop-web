// Single source of truth for resource dropdown values and labels.
// Used by the Mongoose model, the Zod validator, the form, the table and the stats.

export const CATEGORY_OPTIONS = [
  { value: "truck", label: "Garbage truck" },
  { value: "tractor", label: "Tractor" },
  { value: "lorry", label: "Lorry" },
  { value: "compactor", label: "Compactor" },
  { value: "bin", label: "Bin / container" },
  { value: "weighing", label: "Weighing equipment" },
  { value: "ppe", label: "PPE" },
  { value: "other", label: "Other" },
];

// "active" is kept as the stored value for backwards compatibility with
// existing records; it is displayed as "Available".
export const STATUS_OPTIONS = [
  { value: "active", label: "Available" },
  { value: "in_use", label: "In use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "breakdown", label: "Breakdown" },
  { value: "retired", label: "Retired" },
  { value: "out_of_stock", label: "Out of stock" },
];

export const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export const CATEGORY_VALUES = CATEGORY_OPTIONS.map((o) => o.value);
export const STATUS_VALUES = STATUS_OPTIONS.map((o) => o.value);
export const CONDITION_VALUES = CONDITION_OPTIONS.map((o) => o.value);

const toLabelMap = (options) =>
  Object.fromEntries(options.map((o) => [o.value, o.label]));

export const CATEGORY_LABEL = toLabelMap(CATEGORY_OPTIONS);
export const STATUS_LABEL = toLabelMap(STATUS_OPTIONS);
export const CONDITION_LABEL = toLabelMap(CONDITION_OPTIONS);




// Categories that burn fuel and get scheduled on routes (fuel + utilization screens).
export const VEHICLE_CATEGORIES = ["truck", "tractor", "lorry", "compactor"];