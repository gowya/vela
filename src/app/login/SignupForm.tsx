"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PasswordInput } from "./PasswordInput";
import { authButtonClassName, authFieldClassName, authLabelClassName } from "./styles";

export function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = password.length === 0 ? null : password.length < 8 ? "faible" : "fort";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordError(null);
    setConsentError(false);

    if (password.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!consent) {
      setConsentError(true);
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, consent }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.error ?? "Impossible de créer le compte.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Le compte a été créé, mais la connexion a échoué. Essayez de vous connecter.");
      return;
    }

    toast.success("Compte créé.");
    router.push("/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email" className={authLabelClassName}>
          Email
        </Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={authFieldClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="signup-password" className={authLabelClassName}>
            Mot de passe
          </Label>
          {passwordStrength && (
            <span
              aria-label={`Force du mot de passe : ${passwordStrength}`}
              className={
                passwordStrength === "fort"
                  ? "text-xs text-emerald-600 dark:text-emerald-400"
                  : "text-xs text-destructive"
              }
            >
              {passwordStrength}
            </span>
          )}
        </div>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby="signup-password-hint"
          className={authFieldClassName}
        />
        <p
          id="signup-password-hint"
          className={passwordError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
        >
          {passwordError ?? "8 caractères minimum."}
        </p>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="signup-consent"
          className="mt-0.5"
          checked={consent}
          onCheckedChange={(checked) => {
            setConsent(checked === true);
            if (checked === true) {
              setConsentError(false);
            }
          }}
          aria-invalid={consentError}
        />
        <Label
          htmlFor="signup-consent"
          className={
            consentError
              ? "block text-sm leading-relaxed font-normal text-destructive"
              : "block text-sm leading-relaxed font-normal text-muted-foreground"
          }
        >
          J&apos;accepte que mes données soient traitées conformément à la{" "}
          <Link
            href="/confidentialite"
            target="_blank"
            className="underline underline-offset-2 hover:opacity-70"
            onClick={(e) => e.stopPropagation()}
          >
            politique de confidentialité
          </Link>
          .
        </Label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className={authButtonClassName}>
        {isSubmitting ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
