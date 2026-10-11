export const FUEL_TYPE_OPTIONS = [
  { value: "diesel", label: "Diesel" },
  { value: "petrol", label: "Petrol" },
  { value: "other", label: "Other" },
];

export const FUEL_TYPE_VALUES = FUEL_TYPE_OPTIONS.map((o) => o.value);
export const FUEL_TYPE_LABEL = Object.fromEntries(FUEL_TYPE_OPTIONS.map((o) => [o.value, o.label]));

// A vehicle is flagged "high consumption" when this month's km/L is below this
// share of its usual km/L (0.75 = more than 25% worse than usual).
export const HIGH_CONSUMPTION_FACTOR = 0.75;