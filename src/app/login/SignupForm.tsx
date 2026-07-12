"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function SignupForm({ onToggle }: { onToggle: () => void }) {
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

    router.push("/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-3">
      <div className="w-full">
        <Label htmlFor="signup-email" className="mb-1">
          Email
        </Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="w-full">
        <div className="mb-1 flex items-center justify-between">
          <Label htmlFor="signup-password">Mot de passe</Label>
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
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {passwordError && <p className="mt-1 text-sm text-destructive">{passwordError}</p>}
      </div>

      <div className="mt-1 flex items-start gap-2">
        <Checkbox
          id="signup-consent"
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
              ? "text-sm font-normal text-destructive"
              : "text-sm font-normal text-muted-foreground"
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

      {error && <p className="w-full text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Création..." : "Créer mon compte"}
      </Button>

      <button
        type="button"
        onClick={onToggle}
        className="mt-1 w-full text-center text-xs/relaxed text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Se connecter
      </button>
    </form>
  );
}
