import Link from "next/link";
import MaintenanceBoard from "@/components/admin/MaintenanceBoard";

export const metadata = {
  title: "Maintenance & breakdowns — CleanLoop Admin",
};

export default function MaintenancePage() {
  return (
    <div>
      <Link href="/admin/resources" className="text-sm text-loop-700 hover:underline">
        &larr; Back to resources
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-loop-950">
        Maintenance &amp; breakdowns
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        Report breakdowns, schedule servicing, assign replacements and track repairs to completion.
      </p>

      <MaintenanceBoard />
    </div>
  );
}