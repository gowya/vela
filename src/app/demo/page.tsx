"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

// Point d'entrée de la démo publique : crée un espace jetable pré-rempli et
// connecte directement le visiteur, sans passer par l'écran de connexion.
export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Le double appel des effets en mode strict (dev) créerait deux espaces.
  const startedRef = useRef(false);

  const startDemo = useCallback(async () => {
    setError(null);

    const response = await fetch("/api/demo", { method: "POST" }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (!response?.ok || !body?.email) {
      setError(body?.error ?? "La démo n'a pas pu être préparée. Réessayez dans un instant.");
      return;
    }

    const result = await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });
    if (result?.error) {
      setError("La démo n'a pas pu être préparée. Réessayez dans un instant.");
      return;
    }

    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startDemo();
  }, [startDemo]);

  return (
    <AuthShell
      title="Démo de Vela"
      description="Un espace d'exemple avec des patients et des données fictives, effacé sous 24 h."
    >
      {error ? (
        <div className="flex flex-col gap-4">
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
          <Button type="button" size="lg" onClick={() => void startDemo()} className="w-full">
            Réessayer
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-foreground">
          Préparation de votre espace…
        </p>
      )}
    </AuthShell>
  );
}
