import ScheduleManager from "@/components/admin/ScheduleManager";

export const metadata = {
  title: "Schedules — CleanLoop Admin",
};

export default function AdminSchedulesPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-loop-950">
        Collection schedules
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        Draft, publish, and update weekly collection days per zone. Residents
        are notified whenever a published schedule changes.
      </p>

      <ScheduleManager />
    </div>
  );
}
