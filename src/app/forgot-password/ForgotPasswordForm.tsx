"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { authFieldClassName } from "@/components/AuthShell";

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
      <Alert className="gap-2 bg-muted/40">
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
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
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
      </Field>

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}
