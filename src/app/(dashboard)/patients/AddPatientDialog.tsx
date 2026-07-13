"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PatientFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const emptyForm: PatientFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

interface AddPatientDialogProps {
  onCreated: (patient: Patient) => void;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
}

export function AddPatientDialog({ onCreated, triggerVariant = "default" }: AddPatientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof PatientFormState>(
    key: K,
    value: PatientFormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "La création du patient a échoué.");
      return;
    }

    const data = await response.json();
    onCreated(data.patient);
    toast.success("Patient créé", {
      description: `${form.firstName} ${form.lastName} rejoint votre patientèle.`,
      action: {
        label: "Voir la fiche",
        onClick: () => router.push(`/patients?patientId=${data.patient.id}`),
      },
    });
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" variant={triggerVariant} />}>
        Ajouter un patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau patient</DialogTitle>
          <DialogDescription>
            Les autres informations pourront être complétées depuis la fiche du patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                required
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                required
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création…" : "Créer le patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
