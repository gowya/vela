import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { BetaNoticeDialog } from "@/components/BetaNoticeDialog";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import pool from "@/lib/db";
import { requirePractitionerRow } from "@/lib/requirePractitionerRow";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const profile = await requirePractitionerRow<{
    onboarding_completed_at: Date | null;
    beta_notice_dismissed_at: Date | null;
    email_verified_at: Date | null;
    dashboard_visits_count: number;
  }>(
    session,
    `SELECT onboarding_completed_at, beta_notice_dismissed_at, email_verified_at,
            dashboard_visits_count + 1 AS dashboard_visits_count
     FROM practitioners WHERE id = $1`
  );

  if (!profile.onboarding_completed_at) {
    redirect("/onboarding");
  }

  await pool.query(
    "UPDATE practitioners SET dashboard_visits_count = dashboard_visits_count + 1 WHERE id = $1",
    [session.user.id]
  );

  const showBetaNotice = profile.dashboard_visits_count >= 2 && !profile.beta_notice_dismissed_at;

  const userName = session.user?.name ?? session.user?.email ?? "?";
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar userName={userName} />
      <SidebarInset>
        {!profile.email_verified_at && <EmailVerificationBanner />}
        {children}
      </SidebarInset>
      <BetaNoticeDialog initialOpen={showBetaNotice} />
    </SidebarProvider>
  );
}
