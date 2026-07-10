import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountDeletedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[463px]">
        <CardContent className="flex flex-col items-center gap-6 px-14 py-12 text-center">
          <Logo size={72} />

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Compte supprimé
            </h1>
            <p className="text-sm text-muted-foreground">
              Votre compte et l&apos;ensemble des données associées ont été définitivement
              supprimés. Un email de confirmation, avec un export de vos données, vous a été
              envoyé.
            </p>
          </div>

          <Link
            href="/login"
            className="text-sm text-accent-foreground underline underline-offset-2 hover:opacity-70"
          >
            Vous pouvez créer un nouveau compte à tout moment
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
