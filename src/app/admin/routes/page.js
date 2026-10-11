import PageHeader from "@/components/layout/PageHeader";
import RouteBuilder from "@/components/admin/RouteBuilder";

export const metadata = {
  title: "Routes — CleanLoop",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Routes"
        description="Assign collection routes with ordered stops, crew, and a truck. Crews see changes on their dashboard immediately."
      />
      <RouteBuilder />
    </>
  );
}
