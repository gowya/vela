import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <AuthShell
      title="Page introuvable"
      description="Cette page n'existe pas ou a été déplacée."
    >
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Retour à l&apos;accueil
      </Link>
    </AuthShell>
  );
}
