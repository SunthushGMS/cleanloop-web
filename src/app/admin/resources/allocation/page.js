import Link from "next/link";
import AllocationBoard from "@/components/admin/AllocationBoard";

export const metadata = {
  title: "Allocation & availability — CleanLoop Admin",
};

export default function AllocationPage() {
  return (
    <div>
      <Link href="/admin/resources" className="text-sm text-loop-700 hover:underline">
        &larr; Back to resources
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-loop-950">
        Allocation &amp; availability
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        See what is available, assign it to a route and driver, and release it when it returns.
      </p>

      <AllocationBoard />
    </div>
  );
}