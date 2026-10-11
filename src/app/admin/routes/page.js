import RouteBuilder from "@/components/admin/RouteBuilder";

export const metadata = {
  title: "Routes — CleanLoop Admin",
};

export default function AdminRoutesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-loop-950">
        Route builder
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        Assign a collection route — zone, date, and ordered stops — to a
        crew member. It appears on their dashboard immediately.
      </p>

      <RouteBuilder />
    </div>
  );
}