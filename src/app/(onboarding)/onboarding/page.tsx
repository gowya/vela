"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AuthShell, authFieldClassName, authFooterLinkClassName } from "@/components/AuthShell";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ComboboxMultiple } from "@/components/ui/combobox";
import { SPECIALTIES, type SpecialtyValue } from "@/lib/specialties";

export default function OnboardingPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialties, setSpecialties] = useState<SpecialtyValue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (specialties.length === 0) {
      setError("Sélectionnez au moins une spécialité.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        specialties,
      }),
    });

    const data = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "Impossible d'enregistrer ces informations.");
      return;
    }

    router.push("/");
  }

  return (
    <AuthShell
      title="Bienvenue sur Vela"
      description="Quelques informations pour personnaliser votre espace."
      footer={
        <>
          Pas le bon compte ?{" "}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={authFooterLinkClassName}
          >
            Se déconnecter
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <Field>
            <FieldLabel htmlFor="firstName">Prénom</FieldLabel>
            <Input
              id="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={authFieldClassName}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Nom</FieldLabel>
            <Input
              id="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={authFieldClassName}
            />
          </Field>
        </div>

        <ComboboxMultiple
          id="specialties"
          label="Spécialités"
          options={SPECIALTIES}
          value={specialties}
          onValueChange={(values) => {
            setSpecialties(values as SpecialtyValue[]);
            setError(null);
          }}
          placeholder="Sélectionnez vos spécialités"
          className="min-h-9"
        />

        <FieldError>{error}</FieldError>

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Enregistrement…" : "Continuer"}
        </Button>
      </form>
    </AuthShell>
  );
}
