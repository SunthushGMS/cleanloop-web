import AppShell from "@/components/layout/AppShell";
import getCurrentUser from "@/lib/getCurrentUser";

export const metadata = {
  title: "Field app — CleanLoop",
};

export default async function EmployeeLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl">{children}</div>
    </AppShell>
  );
}
