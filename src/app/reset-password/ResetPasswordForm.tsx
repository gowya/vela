"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/app/login/PasswordInput";
import { authButtonClassName, authFieldClassName, authLabelClassName } from "@/app/login/styles";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`);
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);

    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setError(data?.error ?? "Le mot de passe n'a pas pu être modifié. Réessayez.");
      setIsSubmitting(false);
      return;
    }

    // Connexion directe avec le nouveau mot de passe ; en cas d'échec (limite
    // de tentatives atteinte, par exemple), retour à l'écran de connexion.
    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      router.push("/login?reset=success");
      return;
    }

    toast.success("Mot de passe modifié.");
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {/* Permet aux gestionnaires de mots de passe d'associer le nouveau mot
          de passe au bon compte. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password" className={authLabelClassName}>
          Nouveau mot de passe
        </Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError(null);
            setError(null);
          }}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby="new-password-hint"
          className={authFieldClassName}
        />
        <p
          id="new-password-hint"
          className={passwordError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
        >
          {passwordError ?? `${PASSWORD_MIN_LENGTH} caractères minimum.`}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className={authButtonClassName}>
        {isSubmitting ? "Enregistrement…" : "Enregistrer et me connecter"}
      </Button>
    </form>
  );
}
