import AppShell from "@/components/layout/AppShell";
import getCurrentUser from "@/lib/getCurrentUser";

// Shared across all four roles — middleware.js exempts /profile from the
// "redirect to own role home" rule. The shell shows the caller's own nav.
export default async function ProfileLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </AppShell>
  );
}
