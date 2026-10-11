import PageHeader from "@/components/layout/PageHeader";
import ZoneManager from "@/components/admin/ZoneManager";

export const metadata = {
  title: "Zones — CleanLoop",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Zones"
        description="Define the zones and wards, and their known stop addresses, that every other part of CleanLoop selects from."
      />
      <ZoneManager />
    </>
  );
}
