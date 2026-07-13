"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SPECIALTIES, type SpecialtyValue } from "@/lib/specialties";

export default function OnboardingPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState<SpecialtyValue | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!specialty) {
      setError("Sélectionnez votre spécialité.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        specialty: specialty || undefined,
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
    <Card className="w-full max-w-[463px]">
      <CardContent className="flex flex-col items-center gap-8 px-14 py-12">
        <Logo size={64} />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bienvenue sur Vela
          </h1>
          <p className="text-sm text-muted-foreground">
            Quelques informations pour personnaliser votre espace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <div className="flex gap-3">
            <div className="w-full">
              <Label htmlFor="firstName" className="mb-1">
                Prénom
              </Label>
              <Input
                id="firstName"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="w-full">
              <Label htmlFor="lastName" className="mb-1">
                Nom
              </Label>
              <Input
                id="lastName"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="w-full">
            <Combobox
              id="specialty"
              label="Spécialité"
              options={SPECIALTIES}
              value={specialty || null}
              onValueChange={(value) => setSpecialty((value as SpecialtyValue) ?? "")}
              placeholder="Sélectionnez votre spécialité"
            />
          </div>

          {error && <p className="w-full text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Enregistrement..." : "Continuer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
