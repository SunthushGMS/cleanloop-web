import { Suspense } from "react";
import AdminSpotsManager from "@/components/spots/AdminSpotsManager";

export const metadata = {
  title: "Dumping spots — CleanLoop Admin",
};

export default function AdminSpotsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-loop-950">Dumping spots</h1>
      <p className="mt-1 text-sm text-loop-500">
        Review volunteers&apos; spot requests, and see which spots are covered, stale or
        need attention.
      </p>
      <div className="mt-6">
        {/* useSearchParams (the tab) needs a Suspense boundary in the App Router. */}
        <Suspense fallback={<p className="card text-sm text-loop-500">Loading...</p>}>
          <AdminSpotsManager />
        </Suspense>
      </div>
    </div>
  );
}
