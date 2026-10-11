import AppShell from "@/components/layout/AppShell";
import getCurrentUser from "@/lib/getCurrentUser";

export const metadata = {
  title: "Community campaigns — CleanLoop",
};

// /campaigns is shared by every role; the shell's sidebar replaces the old
// "Back to dashboard" link, since the user's own dashboard is one click away.
export default async function CampaignsLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl">{children}</div>
    </AppShell>
  );
}
