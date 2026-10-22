import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AccountDeletedPage() {
  return (
    <AuthShell
      title="Compte supprimé"
      description="Votre compte et l'ensemble des données associées ont été définitivement supprimés. Un email de confirmation, avec un export de vos données, vous a été envoyé."
    >
      <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
        Créer un nouveau compte
      </Link>
    </AuthShell>
  );
}
