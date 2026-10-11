import AppShell from "@/components/layout/AppShell";
import getCurrentUser from "@/lib/getCurrentUser";

export const metadata = {
  title: "Resident dashboard — CleanLoop",
};

export default async function ResidentLayout({ children }) {
  const user = await getCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
