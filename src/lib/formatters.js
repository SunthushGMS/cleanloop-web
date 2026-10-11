// Date-only values (purchase, retirement, disposal dates) are stored as UTC
// midnight, so they are displayed in UTC to avoid showing the previous day.
export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Local (not UTC) yyyy-mm-dd for date inputs.
export function todayInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}