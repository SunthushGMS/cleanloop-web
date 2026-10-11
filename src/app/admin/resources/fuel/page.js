import Link from "next/link";
import FuelUtilizationBoard from "@/components/admin/FuelUtilizationBoard";

export const metadata = {
  title: "Fuel & utilization — CleanLoop Admin",
};

export default function FuelUtilizationPage() {
  return (
    <div>
      <Link href="/admin/resources" className="text-sm text-loop-700 hover:underline">
        &larr; Back to resources
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-loop-950">
        Fuel &amp; utilization
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        Record fuel usage, spot unusually high consumption, and see how well each vehicle is used.
      </p>

      <FuelUtilizationBoard />
    </div>
  );
}