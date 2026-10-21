"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

function VerificationNotice() {
  const searchParams = useSearchParams();
  const verification = searchParams.get("verification");
  const session = searchParams.get("session");

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
      className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

const legalLinks = [
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const isLogin = mode === "login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <main className="flex w-full max-w-[420px] flex-col items-center gap-8">
        <Logo size={64} />

        <Card className="w-full gap-0 py-0 shadow-sm">
          <CardContent className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {isLogin ? "Connexion" : "Créer votre espace"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLogin
                  ? "Retrouvez votre patientèle et vos consultations."
                  : "Un email et un mot de passe suffisent pour commencer."}
              </p>
            </div>

            <Suspense fallback={null}>
              <VerificationNotice />
            </Suspense>

            {isLogin ? <LoginForm /> : <SignupForm />}
          </CardContent>

          <div className="border-t px-6 py-4 text-center text-sm text-muted-foreground sm:px-8">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isLogin ? "signup" : "login")}
              className="rounded-sm font-medium text-primary underline-offset-4 dark:text-foreground dark:underline outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {isLogin ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
        </Card>

        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline-offset-4 hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
