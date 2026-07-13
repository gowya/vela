import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { BetaNoticeDialog } from "@/components/BetaNoticeDialog";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import pool from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { rows } = await pool.query(
    `SELECT onboarding_completed_at, beta_notice_dismissed_at, email_verified_at,
            dashboard_visits_count + 1 AS dashboard_visits_count
     FROM practitioners WHERE id = $1`,
    [session.user.id]
  );
  const profile = rows[0];

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  await pool.query(
    "UPDATE practitioners SET dashboard_visits_count = dashboard_visits_count + 1 WHERE id = $1",
    [session.user.id]
  );

  const showBetaNotice = profile.dashboard_visits_count >= 2 && !profile.beta_notice_dismissed_at;

  const userName = session.user?.name ?? session.user?.email ?? "?";

  return (
    <div className="flex min-h-screen">
      <AppSidebar userName={userName} />
      <div className="min-w-0 flex-1">
        {!profile.email_verified_at && <EmailVerificationBanner />}
        {children}
      </div>
      <BetaNoticeDialog initialOpen={showBetaNotice} />
    </div>
  );
}
