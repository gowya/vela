"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthLayout } from "./AuthLayout";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { authFooterLinkClassName, authNoticeClassName } from "./styles";

function VerificationNotice() {
  const searchParams = useSearchParams();
  const verification = searchParams.get("verification");
  const session = searchParams.get("session");
  const reset = searchParams.get("reset");

  if (reset === "success") {
    return (
      <p role="status" className={cn(authNoticeClassName, "bg-muted/40 text-foreground")}>
        Mot de passe modifié. Connectez-vous avec le nouveau.
      </p>
    );
  }

  const message =
    session === "expired"
      ? "Votre session n'est plus valide. Reconnectez-vous."
      : verification === "expired"
        ? "Le lien de confirmation a expiré. Renvoyez un email depuis votre compte."
        : null;

  if (!message) return null;

  return (
    <p
      role="status"
      className={cn(authNoticeClassName, "border-destructive/20 bg-destructive/5 text-destructive")}
    >
      {message}
    </p>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const isLogin = mode === "login";

  return (
    <AuthLayout
      title={isLogin ? "Connexion" : "Créer votre espace"}
      description={
        isLogin
          ? "Retrouvez votre patientèle et vos consultations."
          : "Un email et un mot de passe suffisent pour commencer."
      }
      footer={
        <>
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "login")}
            className={authFooterLinkClassName}
          >
            {isLogin ? "Créer un compte" : "Se connecter"}
          </button>
        </>
      }
    >
      <Suspense fallback={null}>
        <VerificationNotice />
      </Suspense>

      {isLogin ? <LoginForm /> : <SignupForm />}
    </AuthLayout>
  );
}
