"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function SignupForm({ onToggle }: { onToggle: () => void }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, consent }),
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
        <Label htmlFor="signup-password" className="mb-1">
          Mot de passe
        </Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div className="w-full">
        <Label htmlFor="signup-confirm-password" className="mb-1">
          Confirmer le mot de passe
        </Label>
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      <div className="mt-1 flex items-start gap-2">
        <Checkbox
          id="signup-consent"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
          required
        />
        <Label htmlFor="signup-consent" className="text-sm font-normal text-muted-foreground">
          J&apos;accepte que mes données soient traitées conformément à la politique de
          confidentialité.
        </Label>
      </div>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting || !consent} className="mt-2 w-full">
        {isSubmitting ? "Création..." : "Créer mon compte"}
      </Button>

      <button
        type="button"
        onClick={onToggle}
        className="mt-1 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Se connecter
      </button>
    </form>
  );
}
