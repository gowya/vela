"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AuthShell, authFooterLinkClassName } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

function VerificationNotice() {
  const searchParams = useSearchParams();
  const verification = searchParams.get("verification");
  const session = searchParams.get("session");
  const reset = searchParams.get("reset");

  if (reset === "success") {
    return <Alert variant="success">Mot de passe modifié. Connectez-vous avec le nouveau.</Alert>;
  }

  const message =
    session === "expired"
      ? "Votre session n'est plus valide. Reconnectez-vous."
      : verification === "expired"
        ? "Le lien de confirmation a expiré. Renvoyez un email depuis votre compte."
        : null;

  if (!message) return null;

  return <Alert variant="destructive">{message}</Alert>;
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const isLogin = mode === "login";

  return (
    <AuthShell
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
    </AuthShell>
  );
}
