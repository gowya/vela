"use client";

import { useState, type FormEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  authButtonClassName,
  authFieldClassName,
  authLabelClassName,
  authNoticeClassName,
} from "@/app/login/styles";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setError(data?.error ?? "La demande n'a pas pu être envoyée. Réessayez.");
      return;
    }

    setSentTo(email.trim());
  }

  if (sentTo) {
    // Formulation volontairement conditionnelle : la route répond pareil que
    // le compte existe ou non.
    return (
      <div role="status" className={cn(authNoticeClassName, "flex flex-col gap-2 bg-muted/40 text-foreground")}>
        <p>
          Si un compte Vela est associé à <span className="font-medium">{sentTo}</span>, un lien
          vient d&apos;y être envoyé. Il reste valable une heure.
        </p>
        <p className="text-muted-foreground">
          Rien reçu ? Vérifiez vos courriers indésirables, ou{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="rounded-sm text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            essayez une autre adresse
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className={authLabelClassName}>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          className={authFieldClassName}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className={authButtonClassName}>
        {isSubmitting ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}
