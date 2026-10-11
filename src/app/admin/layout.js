import AppShell from "@/components/layout/AppShell";
import getCurrentUser from "@/lib/getCurrentUser";

export const metadata = {
  title: "Operations — CleanLoop",
};

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
