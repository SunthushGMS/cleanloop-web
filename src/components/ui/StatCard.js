/**
 * KPI tile: icon, label, big value, optional hint line. `tone` picks the
 * icon chip colour.
 */
const TONES = {
  brand: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-clay-50 text-clay-600",
  sky: "bg-sky-50 text-sky-600",
  slate: "bg-loop-100 text-loop-600",
};

export default function StatCard({ label, value, hint, icon: Icon, tone = "brand", loading = false }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-loop-500">{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-loop-100" />
      ) : (
        <p className="mt-1 text-3xl font-bold tracking-tight text-loop-900">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-loop-500">{hint}</p>}
    </div>
  );
}
