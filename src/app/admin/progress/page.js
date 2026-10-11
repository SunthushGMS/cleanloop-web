import PageHeader from "@/components/layout/PageHeader";
import ProgressBoard from "@/components/admin/ProgressBoard";

export const metadata = {
  title: "Live progress — CleanLoop",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Live progress"
        description="Follow every route stop by stop as crews complete them."
      />
      <ProgressBoard />
    </>
  );
}
