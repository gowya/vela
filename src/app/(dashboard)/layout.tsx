import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userName = session.user?.name ?? session.user?.email ?? "?";

  return (
    <div className="flex min-h-screen">
      <AppSidebar userName={userName} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
