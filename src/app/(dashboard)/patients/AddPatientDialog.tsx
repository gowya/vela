"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CustomFieldDefinition, CustomFieldType, Patient } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texte",
  choice: "Choix",
  date: "Date",
  number: "Nombre",
};

interface PatientFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  genderIdentity: string;
  identifiedIssue: string;
  address: string;
  status: string;
  intakeNotes: string;
  nextAppointmentAt: string;
}

const emptyForm: PatientFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  genderIdentity: "",
  identifiedIssue: "",
  address: "",
  status: "",
  intakeNotes: "",
  nextAppointmentAt: "",
};

interface AddPatientDialogProps {
  onCreated: (patient: Patient) => void;
}

export function AddPatientDialog({ onCreated }: AddPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<
    CustomFieldDefinition[]
  >([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(
    {}
  );
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/custom-fields")
      .then((response) => response.json())
      .then((data) => setCustomFieldDefinitions(data.customFields ?? []));
  }, [open]);

  function updateField<K extends keyof PatientFormState>(
    key: K,
    value: PatientFormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleAddCustomField() {
    if (!newFieldName.trim()) return;

    const response = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldName: newFieldName, fieldType: newFieldType }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "La création du champ personnalisé a échoué.");
      return;
    }

    const data = await response.json();
    setCustomFieldDefinitions((previous) => [...previous, data.customField]);
    setNewFieldName("");
    setNewFieldType("text");
    setIsAddingField(false);
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
        birthDate: form.birthDate,
        genderIdentity: form.genderIdentity,
        identifiedIssue: form.identifiedIssue,
        address: form.address,
        status: form.status,
        intakeNotes: form.intakeNotes,
        nextAppointmentAt: form.nextAppointmentAt
          ? new Date(form.nextAppointmentAt).toISOString()
          : null,
        customFields: Object.entries(customFieldValues)
          .filter(([, value]) => value.trim().length > 0)
          .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value })),
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
    setForm(emptyForm);
    setCustomFieldValues({});
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>
        Ajouter un nouveau patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau patient</DialogTitle>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(event) => updateField("birthDate", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="genderIdentity">Identité de genre</Label>
              <Input
                id="genderIdentity"
                value={form.genderIdentity}
                onChange={(event) => updateField("genderIdentity", event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="identifiedIssue">Problématique identifiée</Label>
            <Input
              id="identifiedIssue"
              value={form.identifiedIssue}
              onChange={(event) => updateField("identifiedIssue", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="status">Statut</Label>
              <Input
                id="status"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextAppointmentAt">Prochain rendez-vous</Label>
              <Input
                id="nextAppointmentAt"
                type="datetime-local"
                value={form.nextAppointmentAt}
                onChange={(event) =>
                  updateField("nextAppointmentAt", event.target.value)
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="intakeNotes">Notes de prise en charge</Label>
            <Textarea
              id="intakeNotes"
              value={form.intakeNotes}
              onChange={(event) => updateField("intakeNotes", event.target.value)}
            />
          </div>

          {customFieldDefinitions.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {customFieldDefinitions.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={`custom-${field.id}`}>{field.fieldName}</Label>
                  <Input
                    id={`custom-${field.id}`}
                    type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
                    value={customFieldValues[field.id] ?? ""}
                    onChange={(event) =>
                      setCustomFieldValues((previous) => ({
                        ...previous,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3">
            {isAddingField ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="newFieldName">Nom du champ</Label>
                  <Input
                    id="newFieldName"
                    value={newFieldName}
                    onChange={(event) => setNewFieldName(event.target.value)}
                  />
                </div>
                <Select
                  value={newFieldType}
                  onValueChange={(value) => setNewFieldType(value as CustomFieldType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CUSTOM_FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddCustomField}>
                  Ajouter
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setIsAddingField(true)}>
                Ajouter un champ personnalisé
              </Button>
            )}
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
