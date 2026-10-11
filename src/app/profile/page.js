import { redirect } from "next/navigation";
import getCurrentUser from "@/lib/getCurrentUser";
import ProfileManager from "@/components/ProfileManager";
import PageHeader from "@/components/layout/PageHeader";

export const metadata = {
  title: "Account & security — CleanLoop",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  // Belt-and-suspenders: middleware.js already redirects unauthenticated
  // requests to /login, but a server component shouldn't rely on that
  // alone (e.g. if the matcher config ever changes).
  if (!user) {
    redirect("/login?next=/profile");
  }

  return (
    <div>
      <PageHeader
        title="Account & security"
        description="Update your name, email, zone, and password."
      />

      <ProfileManager initialUser={user} />
    </div>
  );
}