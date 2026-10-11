import PageHeader from "@/components/layout/PageHeader";
import ScheduleManager from "@/components/admin/ScheduleManager";

export const metadata = {
  title: "Schedules — CleanLoop",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Collection schedules"
        description="Draft, publish, and update weekly collection days per zone. Residents are notified whenever a published schedule changes."
      />
      <ScheduleManager />
    </>
  );
}
