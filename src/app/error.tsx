"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <AuthShell
      title="Une erreur est survenue"
      description="La page n'a pas pu s'afficher. Les données déjà enregistrées ne sont pas perdues."
    >
      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" onClick={reset} className="w-full">
          Réessayer
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-full")}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </AuthShell>
  );
}
