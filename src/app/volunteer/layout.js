import AppShell from "@/components/layout/AppShell";
import getCurrentUser from "@/lib/getCurrentUser";

export const metadata = {
  title: "Volunteer portal — CleanLoop",
};

export default async function VolunteerLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl">{children}</div>
    </AppShell>
  );
}
