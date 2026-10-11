import Link from "next/link";
import LifecycleBoard from "@/components/admin/LifecycleBoard";

export const metadata = {
  title: "Asset lifecycle — CleanLoop Admin",
};

export default function LifecyclePage() {
  return (
    <div>
      <Link href="/admin/resources" className="text-sm text-loop-700 hover:underline">
        &larr; Back to resources
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-loop-950">Asset lifecycle</h1>
      <p className="mt-1 text-sm text-loop-500">
        Track asset value, decide when to replace a resource, and record retirement and disposal.
      </p>

      <LifecycleBoard />
    </div>
  );
}