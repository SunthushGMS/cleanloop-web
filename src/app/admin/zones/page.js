import ZoneManager from "@/components/admin/ZoneManager";

export const metadata = {
  title: "Zones — CleanLoop Admin",
};

export default function AdminZonesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-loop-950">
        Zone manager
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        Define the zones/wards and their known stop addresses that every
        other part of CleanLoop selects from.
      </p>

      <ZoneManager />
    </div>
  );
}