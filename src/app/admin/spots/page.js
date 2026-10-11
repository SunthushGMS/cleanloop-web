import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import AdminSpotsManager from "@/components/spots/AdminSpotsManager";

export const metadata = {
  title: "Dumping spots — CleanLoop Admin",
};

export default function AdminSpotsPage() {
  return (
    <div>
      <PageHeader
        title="Dumping spots"
        description="Review volunteers' spot requests, and see which spots are covered, stale or need attention."
      />
      {/* useSearchParams (the tab) needs a Suspense boundary in the App Router. */}
      <Suspense fallback={<p className="card text-sm text-loop-500">Loading...</p>}>
        <AdminSpotsManager />
      </Suspense>
    </div>
  );
}
