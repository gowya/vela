"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({ onToggle }: { onToggle: () => void }) {
  const router = useRouter();
  const callbackUrl = "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    router.push(result?.url ?? callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-3">
      <div className="w-full">
        <Label htmlFor="email" className="mb-1">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="w-full">
        <Label htmlFor="password" className="mb-1">
          Mot de passe
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Connexion..." : "Se connecter"}
      </Button>

      <button
        type="button"
        onClick={onToggle}
        className="mt-1 w-full text-center text-xs/relaxed text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Créer un compte
      </button>
    </form>
  );
}
