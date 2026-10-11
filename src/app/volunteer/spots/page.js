import { Suspense } from "react";
import Link from "next/link";
import VolunteerSpots from "@/components/spots/VolunteerSpots";

export const metadata = {
  title: "Adopt-a-Spot — CleanLoop",
};

export default function VolunteerSpotsPage() {
  return (
    <div>
      <Link href="/volunteer" className="mb-6 inline-block text-sm text-loop-700 underline hover:text-loop-900">
        &larr; Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-bold text-loop-950">Adopt-a-Spot</h1>
      <p className="mt-1 text-sm text-loop-500">
        Look after a problem place: check it every week or two and flag dumping to operations.
      </p>
      <div className="mt-6">
        {/* useSearchParams (the tab) needs a Suspense boundary in the App Router. */}
        <Suspense fallback={<p className="card text-sm text-loop-500">Loading...</p>}>
          <VolunteerSpots />
        </Suspense>
      </div>
    </div>
  );
}
