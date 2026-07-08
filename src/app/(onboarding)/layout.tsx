import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { rows } = await pool.query(
    "SELECT onboarding_completed_at FROM practitioners WHERE id = $1",
    [session.user.id]
  );

  if (rows[0]?.onboarding_completed_at) {
    redirect("/");
  }

  return <div className="flex min-h-screen items-center justify-center bg-background px-4">{children}</div>;
}
