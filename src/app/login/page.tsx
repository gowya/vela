"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

function VerificationNotice() {
  const searchParams = useSearchParams();
  const verification = searchParams.get("verification");

  if (verification !== "expired") return null;

  return (
    <p className="w-full text-center text-sm text-destructive">
      Le lien de confirmation a expiré. Renvoyez un email depuis votre compte.
    </p>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[463px]">
        <CardContent className="flex flex-col items-center gap-10 px-14 py-12">
          <Logo size={72} />

          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {mode === "login" ? "Connectez-vous à votre espace" : "Créez votre espace"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Retrouvez votre patientèle et vos consultations."
                : "Quelques informations pour commencer."}
            </p>
          </div>

          <Suspense fallback={null}>
            <VerificationNotice />
          </Suspense>

          {mode === "login" ? (
            <LoginForm onToggle={() => setMode("signup")} />
          ) : (
            <SignupForm onToggle={() => setMode("login")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
