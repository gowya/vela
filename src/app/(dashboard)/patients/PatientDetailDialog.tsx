"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ConsultationListItem, Patient } from "@/types";
import { calculateAge, isBirthdaySoon } from "@/lib/patient-utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NewConsultationDialog } from "@/app/(dashboard)/consultations/NewConsultationDialog";

interface PatientDetailField {
  fieldDefinitionId: string;
  fieldName: string;
  fieldType: string;
  value: string | null;
}

interface EditFormState {
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

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

function toDateTimeLocalValue(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

interface PatientDetailDialogProps {
  patientId: string | null;
  onClose: () => void;
  onUpdated: (patient: Patient) => void;
}

export function PatientDetailDialog({
  patientId,
  onClose,
  onUpdated,
}: PatientDetailDialogProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [customFields, setCustomFields] = useState<PatientDetailField[]>([]);
  const [consultations, setConsultations] = useState<ConsultationListItem[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPatient(null);
    setCustomFields([]);
    setConsultations(null);
    setIsEditing(false);
    setError(null);

    if (!patientId) return;

    let cancelled = false;

    async function loadPatient() {
      const response = await fetch(`/api/patients/${patientId}`);
      if (!response.ok) {
        if (!cancelled) setError("Impossible de charger ce patient.");
        return;
      }
      const data = await response.json();
      if (!cancelled) {
        setPatient(data.patient);
        setCustomFields(data.customFields ?? []);
      }
    }

    async function loadConsultations() {
      const response = await fetch(`/api/consultations?patientId=${patientId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setConsultations(data.consultations ?? []);
    }

    loadPatient();
    loadConsultations();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function startEditing() {
    if (!patient) return;
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email ?? "",
      phone: patient.phone ?? "",
      birthDate: patient.birthDate ?? "",
      genderIdentity: patient.genderIdentity ?? "",
      identifiedIssue: patient.identifiedIssue ?? "",
      address: patient.address ?? "",
      status: patient.status ?? "",
      intakeNotes: patient.intakeNotes ?? "",
      nextAppointmentAt: toDateTimeLocalValue(patient.nextAppointmentAt),
    });
    setCustomFieldValues(
      Object.fromEntries(
        customFields.map((field) => [field.fieldDefinitionId, field.value ?? ""])
      )
    );
    setError(null);
    setIsEditing(true);
  }

  function updateField<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || !form) return;
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
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
        customFields: Object.entries(customFieldValues).map(
          ([fieldDefinitionId, value]) => ({ fieldDefinitionId, value })
        ),
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "La mise à jour du patient a échoué.");
      return;
    }

    const data = await response.json();
    setPatient(data.patient);
    setCustomFields(data.customFields ?? []);
    setIsEditing(false);
    onUpdated(data.patient);
  }

  const open = patientId !== null;
  const age = patient ? calculateAge(patient.birthDate) : null;
  const birthdaySoon = patient ? isBirthdaySoon(patient.birthDate) : false;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}
          </DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!patient && !error && (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}

        {patient && !isEditing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Âge</p>
                <p className="text-foreground">{age !== null ? `${age} ans` : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Anniversaire</p>
                <p className="text-foreground">
                  {birthdaySoon ? "Dans les 7 jours" : "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="text-foreground">{patient.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Téléphone</p>
                <p className="text-foreground">{patient.phone ?? "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Identité de genre</p>
                <p className="text-foreground">{patient.genderIdentity ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Statut</p>
                <p className="text-foreground">{patient.status ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Problématique identifiée</p>
              <p className="text-foreground">{patient.identifiedIssue ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Adresse</p>
              <p className="text-foreground">{patient.address ?? "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Dernier RDV</p>
                <p className="text-foreground">{formatDate(patient.lastAppointmentAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prochain RDV</p>
                <p className="text-foreground">{formatDate(patient.nextAppointmentAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Notes de prise en charge</p>
              <p className="whitespace-pre-wrap text-foreground">
                {patient.intakeNotes ?? "—"}
              </p>
            </div>

            {customFields.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {customFields.map((field) => (
                  <div key={field.fieldDefinitionId}>
                    <p className="text-muted-foreground">{field.fieldName}</p>
                    <p className="text-foreground">{field.value ?? "—"}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Consultations</p>
                <NewConsultationDialog
                  patientId={patient.id}
                  triggerLabel="Nouvelle consultation"
                  triggerVariant="outline"
                />
              </div>

              {consultations === null && (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              )}
              {consultations?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucune consultation enregistrée pour ce patient.
                </p>
              )}
              {consultations && consultations.length > 0 && (
                <div className="flex flex-col gap-1">
                  {consultations.slice(0, 3).map((consultation) => (
                    <Link
                      key={consultation.id}
                      href={`/consultations/${consultation.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted/50"
                    >
                      <span className="text-foreground">
                        {consultation.title ?? "Sans titre"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(consultation.date).toLocaleDateString("fr-FR")}
                      </span>
                    </Link>
                  ))}
                  <Link
                    href={`/consultations?patientId=${patient.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Voir toutes ses consultations ({consultations.length})
                  </Link>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={startEditing}>
                Modifier
              </Button>
            </DialogFooter>
          </div>
        )}

        {patient && isEditing && form && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-firstName">Prénom</Label>
                <Input
                  id="edit-firstName"
                  required
                  value={form.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Nom</Label>
                <Input
                  id="edit-lastName"
                  required
                  value={form.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input
                  id="edit-phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-birthDate">Date de naissance</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => updateField("birthDate", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-genderIdentity">Identité de genre</Label>
                <Input
                  id="edit-genderIdentity"
                  value={form.genderIdentity}
                  onChange={(event) => updateField("genderIdentity", event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-identifiedIssue">Problématique identifiée</Label>
              <Input
                id="edit-identifiedIssue"
                value={form.identifiedIssue}
                onChange={(event) => updateField("identifiedIssue", event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Adresse</Label>
              <Input
                id="edit-address"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-status">Statut</Label>
                <Input
                  id="edit-status"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-nextAppointmentAt">Prochain rendez-vous</Label>
                <Input
                  id="edit-nextAppointmentAt"
                  type="datetime-local"
                  value={form.nextAppointmentAt}
                  onChange={(event) =>
                    updateField("nextAppointmentAt", event.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-intakeNotes">Notes de prise en charge</Label>
              <Textarea
                id="edit-intakeNotes"
                value={form.intakeNotes}
                onChange={(event) => updateField("intakeNotes", event.target.value)}
              />
            </div>

            {customFields.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                {customFields.map((field) => (
                  <div key={field.fieldDefinitionId}>
                    <Label htmlFor={`edit-custom-${field.fieldDefinitionId}`}>
                      {field.fieldName}
                    </Label>
                    <Input
                      id={`edit-custom-${field.fieldDefinitionId}`}
                      type={
                        field.fieldType === "number"
                          ? "number"
                          : field.fieldType === "date"
                          ? "date"
                          : "text"
                      }
                      value={customFieldValues[field.fieldDefinitionId] ?? ""}
                      onChange={(event) =>
                        setCustomFieldValues((previous) => ({
                          ...previous,
                          [field.fieldDefinitionId]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
