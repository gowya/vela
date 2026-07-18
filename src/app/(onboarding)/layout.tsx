import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requirePractitionerRow } from "@/lib/requirePractitionerRow";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const profile = await requirePractitionerRow<{ onboarding_completed_at: Date | null }>(
    session,
    "SELECT onboarding_completed_at FROM practitioners WHERE id = $1"
  );

  if (profile.onboarding_completed_at) {
    redirect("/");
  }

  return <div className="flex min-h-screen items-center justify-center bg-background px-4">{children}</div>;
}
