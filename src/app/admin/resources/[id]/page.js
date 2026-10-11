import ResourceDetail from "@/components/admin/ResourceDetail";

export const metadata = {
  title: "Resource details — CleanLoop Admin",
};

export default function ResourceDetailPage({ params }) {
  return <ResourceDetail id={params.id} />;
}