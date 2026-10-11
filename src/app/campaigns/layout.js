import Link from "next/link";
import Navbar from "@/components/Navbar";
import getCurrentUser from "@/lib/getCurrentUser";

// /campaigns is shared by every role, so the back link goes to whichever
// dashboard belongs to the current user.
const ROLE_HOME = {
  resident: "/resident",
  admin: "/admin",
  employee: "/employee",
  volunteer: "/volunteer",
};

export default async function CampaignsLayout({ children }) {
  const user = await getCurrentUser();
  const home = user ? ROLE_HOME[user.role] : null;
  return (
    <div className="min-h-screen bg-sand">
      <Navbar user={user} title="Community campaigns" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {home && (
          <Link
            href={home}
            className="mb-6 inline-block text-sm text-loop-700 underline hover:text-loop-900"
          >
            &larr; Back to dashboard
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
