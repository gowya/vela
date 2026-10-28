"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { authFieldClassName } from "@/components/AuthShell";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = password.length === 0 ? null : password.length < PASSWORD_MIN_LENGTH ? "faible" : "fort";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordError(null);
    setConsentError(false);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`);
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
      <Field>
        <FieldLabel htmlFor="signup-email">Email</FieldLabel>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={authFieldClassName}
        />
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="signup-password">Mot de passe</FieldLabel>
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
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby="signup-password-hint"
          className={authFieldClassName}
        />
        <FieldDescription
          id="signup-password-hint"
          className={passwordError ? "text-destructive" : undefined}
        >
          {passwordError ?? `${PASSWORD_MIN_LENGTH} caractères minimum.`}
        </FieldDescription>
      </Field>

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

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
