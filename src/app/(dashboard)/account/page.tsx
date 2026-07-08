import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Compte</h1>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>{session?.user?.name ?? "—"}</CardTitle>
          <CardDescription>{session?.user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <SignOutButton />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Apparence</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
