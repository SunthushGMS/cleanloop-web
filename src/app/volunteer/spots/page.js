import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import VolunteerSpots from "@/components/spots/VolunteerSpots";

export const metadata = {
  title: "Adopt-a-Spot — CleanLoop",
};

export default function VolunteerSpotsPage() {
  return (
    <div>
      <PageHeader
        title="Adopt-a-Spot"
        description="Look after a problem place: check it every week or two and flag dumping to operations."
      />
      {/* useSearchParams (the tab) needs a Suspense boundary in the App Router. */}
      <Suspense fallback={<p className="card text-sm text-loop-500">Loading...</p>}>
        <VolunteerSpots />
      </Suspense>
    </div>
  );
}
