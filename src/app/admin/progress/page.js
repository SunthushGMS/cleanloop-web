import ProgressBoard from "@/components/admin/ProgressBoard";

export const metadata = {
  title: "Live progress — CleanLoop Admin",
};

export default function AdminProgressPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-loop-950">
        Collection progress
      </h1>
      <p className="mt-1 text-sm text-loop-500">
        Follow every route stop by stop as crews complete them.
      </p>

      <ProgressBoard />
    </div>
  );
}
