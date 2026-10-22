"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";
import { fontVariables } from "./fonts";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

// Remplace le layout racine quand celui-ci échoue : il faut donc reposer
// <html>, <body>, les styles et les polices.
export default function GlobalError({
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
    <html lang="fr" className={fontVariables}>
      <body className="font-sans">
        <AuthShell
          title="Une erreur est survenue"
          description="Vela n'a pas pu s'afficher. Les données déjà enregistrées ne sont pas perdues."
        >
          <div className="flex flex-col gap-2">
            <Button type="button" size="lg" onClick={reset} className="w-full">
              Réessayer
            </Button>
            {/* Rechargement complet plutôt que navigation client : le layout
                racine a planté, on repart de zéro. */}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => window.location.assign("/")}
              className="w-full"
            >
              Retour à l&apos;accueil
            </Button>
          </div>
        </AuthShell>
      </body>
    </html>
  );
}
