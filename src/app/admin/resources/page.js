import PageHeader from "@/components/layout/PageHeader";
import ResourceManager from "@/components/admin/ResourceManager";

export const metadata = {
  title: "Resources — CleanLoop",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Resources"
        description="Register and track bins, trucks, and PPE: status, condition, and zone assignment."
      />
      <ResourceManager />
    </>
  );
}
