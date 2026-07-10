"use client";

import { useEffect, useRef, useState, type FormEvent, type UIEvent } from "react";
import Link from "next/link";
import type {
  ConsultationListItem,
  CustomFieldDefinition,
  CustomFieldType,
  Patient,
} from "@/types";
import { calculateAge, isBirthdaySoon } from "@/lib/patient-utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewConsultationDialog } from "@/app/(dashboard)/consultations/NewConsultationDialog";
import {
  AddressBookIcon,
  CalendarCheckIcon,
  NotebookIcon,
  NoteIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";

interface PatientDetailField {
  fieldDefinitionId: string;
  fieldName: string;
  fieldType: string;
  options: string[] | null;
  allowMultiple: boolean;
  value: string | null;
}

// Les valeurs des champs à choix multiple sont stockées en JSON (tableau de
// chaînes) dans la même colonne texte que les autres types de champ — pas de
// schéma dédié pour éviter d'élargir `patient_custom_field_values`.
function parseChoiceValue(value: string | null | undefined, allowMultiple: boolean): string[] {
  if (!value) return [];
  if (!allowMultiple) return [value];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatChoiceDisplay(value: string | null | undefined, allowMultiple: boolean): string {
  const values = parseChoiceValue(value, allowMultiple);
  return values.length > 0 ? values.join(", ") : "—";
}

function isCustomFieldValueEmpty(
  value: string,
  fieldType: string,
  allowMultiple: boolean
): boolean {
  if (fieldType === "choice" && allowMultiple) {
    return parseChoiceValue(value, true).length === 0;
  }
  return value.trim().length === 0;
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

const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texte",
  choice: "Choix",
  date: "Date",
  number: "Nombre",
};

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

function SectionHeader({ icon: SectionIcon, label }: { icon: Icon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      <SectionIcon size={14} />
      <span>{label}</span>
    </div>
  );
}

interface PatientDetailDialogProps {
  patientId: string | null;
  onClose: () => void;
  onUpdated: (patient: Patient) => void;
  // Ouvre directement en mode édition (et place le focus sur ce champ) : utilisé
  // pour les liens qui amènent ici depuis un autre écran avec une intention précise
  // (ex. "planifier le prochain rendez-vous" depuis le tableau de bord).
  autoEditField?: keyof EditFormState;
}

export function PatientDetailDialog({
  patientId,
  onClose,
  onUpdated,
  autoEditField,
}: PatientDetailDialogProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [customFields, setCustomFields] = useState<PatientDetailField[]>([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<
    CustomFieldDefinition[]
  >([]);
  const [consultations, setConsultations] = useState<ConsultationListItem[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>(["", ""]);
  const [newFieldAllowMultiple, setNewFieldAllowMultiple] = useState(false);
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Bascule l'en-tête en mode condensé (résumé genre/âge visible) une fois que
  // la section Identité a défilé hors champ, pour garder ce repère sous les yeux.
  const [isScrolled, setIsScrolled] = useState(false);
  const autoEditTriggeredRef = useRef(false);

  useEffect(() => {
    setPatient(null);
    setCustomFields([]);
    setConsultations(null);
    setIsEditing(false);
    setIsAddingField(false);
    setError(null);
    setIsScrolled(false);
    autoEditTriggeredRef.current = false;

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

    // Toutes les définitions de champs personnalisés du praticien (pas seulement
    // celles déjà valorisées pour ce patient) : nécessaire pour proposer en édition
    // les champs créés pour d'autres patients mais jamais encore utilisés ici.
    async function loadCustomFieldDefinitions() {
      const response = await fetch("/api/custom-fields");
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setCustomFieldDefinitions(data.customFields ?? []);
    }

    loadPatient();
    loadConsultations();
    loadCustomFieldDefinitions();
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
    const existingValues = Object.fromEntries(
      customFields.map((field) => [field.fieldDefinitionId, field.value ?? ""])
    );
    setCustomFieldValues(
      Object.fromEntries(
        customFieldDefinitions.map((definition) => [
          definition.id,
          existingValues[definition.id] ?? "",
        ])
      )
    );
    setIsAddingField(false);
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldOptions(["", ""]);
    setNewFieldAllowMultiple(false);
    setError(null);
    setIsEditing(true);
  }

  useEffect(() => {
    if (!autoEditField || !patient || autoEditTriggeredRef.current) return;
    autoEditTriggeredRef.current = true;
    startEditing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEditField, patient]);

  useEffect(() => {
    if (!isEditing || !autoEditField) return;
    const field = document.getElementById(`edit-${autoEditField}`);
    field?.scrollIntoView({ block: "center" });
    field?.focus();
  }, [isEditing, autoEditField]);

  function updateField<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));
  }

  const trimmedNewFieldOptions = newFieldOptions.map((option) => option.trim()).filter(Boolean);
  const isChoiceFieldValid = newFieldType !== "choice" || trimmedNewFieldOptions.length >= 2;

  function updateNewFieldOption(index: number, value: string) {
    setNewFieldOptions((previous) =>
      previous.map((option, optionIndex) => (optionIndex === index ? value : option))
    );
  }

  function addNewFieldOption() {
    setNewFieldOptions((previous) => [...previous, ""]);
  }

  function removeNewFieldOption(index: number) {
    setNewFieldOptions((previous) => previous.filter((_, optionIndex) => optionIndex !== index));
  }

  async function handleAddCustomField() {
    if (!newFieldName.trim() || !isChoiceFieldValid) return;
    setIsCreatingField(true);
    setError(null);

    const response = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldName: newFieldName,
        fieldType: newFieldType,
        options: newFieldType === "choice" ? trimmedNewFieldOptions : [],
        allowMultiple: newFieldType === "choice" ? newFieldAllowMultiple : false,
      }),
    });

    setIsCreatingField(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "La création du champ personnalisé a échoué.");
      return;
    }

    const data = await response.json();
    setCustomFieldDefinitions((previous) => [...previous, data.customField]);
    setCustomFieldValues((previous) => ({ ...previous, [data.customField.id]: "" }));
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldOptions(["", ""]);
    setNewFieldAllowMultiple(false);
    setIsAddingField(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || !form) return;
    setError(null);
    setIsSubmitting(true);

    // On n'envoie que les champs personnalisés renseignés ou déjà valorisés
    // auparavant (pour permettre leur effacement) : évite de créer une ligne
    // vide pour chaque champ personnalisé existant du praticien à chaque
    // enregistrement, y compris ceux jamais utilisés pour ce patient.
    const previouslySetFieldIds = new Set(
      customFields
        .filter((field) => !isCustomFieldValueEmpty(field.value ?? "", field.fieldType, field.allowMultiple))
        .map((field) => field.fieldDefinitionId)
    );
    const definitionById = new Map(
      customFieldDefinitions.map((definition) => [definition.id, definition])
    );

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
        customFields: Object.entries(customFieldValues)
          .filter(([fieldDefinitionId, value]) => {
            const definition = definitionById.get(fieldDefinitionId);
            const isEmpty = definition
              ? isCustomFieldValueEmpty(value, definition.fieldType, definition.allowMultiple)
              : value.trim().length === 0;
            return !isEmpty || previouslySetFieldIds.has(fieldDefinitionId);
          })
          .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value })),
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

  function handleContentScroll(event: UIEvent<HTMLDivElement>) {
    setIsScrolled(event.currentTarget.scrollTop > 4);
  }

  const open = patientId !== null;
  const age = patient ? calculateAge(patient.birthDate) : null;
  const birthdaySoon = patient ? isBirthdaySoon(patient.birthDate) : false;
  const identitySummary = patient
    ? [patient.genderIdentity, age !== null ? `${age} ans` : null].filter(Boolean).join(" · ")
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        onScroll={handleContentScroll}
        showCloseButton={false}
      >
        <div className="sticky -top-4 -mx-4 -mt-4 z-10 flex items-start justify-between gap-3 border-b border-border bg-popover pt-4 pr-4 pb-3 pl-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="truncate">
              {patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}
            </DialogTitle>
            {identitySummary && (
              <p
                className={cn(
                  "overflow-hidden text-xs text-muted-foreground transition-all duration-200 ease-out",
                  isScrolled ? "max-h-5 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {identitySummary}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {patient && !isEditing && (
              <Button type="button" size="sm" onClick={startEditing}>
                Modifier
              </Button>
            )}
            <DialogClose
              render={<Button type="button" variant="ghost" size="icon-sm" />}
            >
              <XIcon />
              <span className="sr-only">Fermer</span>
            </DialogClose>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!patient && !error && (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}

        {patient && !isEditing && (
          <div className="flex flex-col gap-5 text-sm">
            <div className="flex flex-col gap-2">
              <SectionHeader icon={UserIcon} label="Identité" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Date de naissance</p>
                  <p className="text-foreground">
                    {formatDate(patient.birthDate)}
                    {age !== null && (
                      <span className="text-muted-foreground"> ({age} ans)</span>
                    )}
                  </p>
                  {birthdaySoon && (
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Anniversaire dans les 7 jours
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Identité de genre</p>
                  <p className="text-foreground">{patient.genderIdentity ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <SectionHeader icon={CalendarCheckIcon} label="Consultations" />
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

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <SectionHeader icon={AddressBookIcon} label="Contact" />
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
              <div>
                <p className="text-muted-foreground">Adresse</p>
                <p className="text-foreground">{patient.address ?? "—"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <SectionHeader icon={NotebookIcon} label="Suivi" />
              <div>
                <p className="text-muted-foreground">Problématique identifiée</p>
                <p className="text-foreground">{patient.identifiedIssue ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <p className="text-foreground">{patient.status ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dernier rendez-vous</p>
                  <p className="text-foreground">{formatDate(patient.lastAppointmentAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Prochain rendez-vous</p>
                <p className="text-foreground">{formatDate(patient.nextAppointmentAt)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <SectionHeader icon={NoteIcon} label="Notes de prise en charge" />
              <p className="whitespace-pre-wrap text-foreground">
                {patient.intakeNotes ?? "—"}
              </p>
            </div>

            {customFields.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <SectionHeader icon={TagIcon} label="Champs personnalisés" />
                <div className="grid grid-cols-2 gap-3">
                  {customFields.map((field) => (
                    <div key={field.fieldDefinitionId}>
                      <p className="text-muted-foreground">{field.fieldName}</p>
                      <p className="text-foreground">
                        {field.fieldType === "choice"
                          ? formatChoiceDisplay(field.value, field.allowMultiple)
                          : field.value ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {patient && isEditing && form && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <SectionHeader icon={UserIcon} label="Identité" />
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
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <SectionHeader icon={AddressBookIcon} label="Contact" />
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
              <div>
                <Label htmlFor="edit-address">Adresse</Label>
                <Input
                  id="edit-address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <SectionHeader icon={NotebookIcon} label="Suivi" />
              <div>
                <Label htmlFor="edit-identifiedIssue">Problématique identifiée</Label>
                <Input
                  id="edit-identifiedIssue"
                  value={form.identifiedIssue}
                  onChange={(event) => updateField("identifiedIssue", event.target.value)}
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
                  <Label>Dernier rendez-vous</Label>
                  <p className="flex h-7 items-center text-muted-foreground">
                    {formatDate(patient.lastAppointmentAt)}
                  </p>
                </div>
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

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <SectionHeader icon={NoteIcon} label="Notes de prise en charge" />
              <Textarea
                id="edit-intakeNotes"
                value={form.intakeNotes}
                onChange={(event) => updateField("intakeNotes", event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <SectionHeader icon={TagIcon} label="Champs personnalisés" />

              {customFieldDefinitions.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {customFieldDefinitions.map((definition) => (
                    <div
                      key={definition.id}
                      className={
                        definition.fieldType === "choice" && definition.allowMultiple
                          ? "col-span-2"
                          : undefined
                      }
                    >
                      <Label htmlFor={`edit-custom-${definition.id}`}>
                        {definition.fieldName}
                      </Label>
                      {definition.fieldType === "choice" ? (
                        definition.allowMultiple ? (
                          <div className="flex flex-col gap-1.5 pt-1">
                            {(definition.options ?? []).map((option) => {
                              const selected = parseChoiceValue(
                                customFieldValues[definition.id],
                                true
                              );
                              const checked = selected.includes(option);
                              return (
                                <label
                                  key={option}
                                  className="flex items-center gap-2 text-sm text-foreground"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(next) =>
                                      setCustomFieldValues((previous) => {
                                        const current = parseChoiceValue(
                                          previous[definition.id],
                                          true
                                        );
                                        const updated =
                                          next === true
                                            ? [...current, option]
                                            : current.filter((value) => value !== option);
                                        return {
                                          ...previous,
                                          [definition.id]: JSON.stringify(updated),
                                        };
                                      })
                                    }
                                  />
                                  {option}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <Select
                            items={Object.fromEntries(
                              (definition.options ?? []).map((option) => [option, option])
                            )}
                            value={customFieldValues[definition.id] || undefined}
                            onValueChange={(value) =>
                              setCustomFieldValues((previous) => ({
                                ...previous,
                                [definition.id]: value ?? "",
                              }))
                            }
                          >
                            <SelectTrigger id={`edit-custom-${definition.id}`} className="w-full">
                              <SelectValue placeholder="Sélectionner…" />
                            </SelectTrigger>
                            <SelectContent>
                              {(definition.options ?? []).map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      ) : (
                        <Input
                          id={`edit-custom-${definition.id}`}
                          type={
                            definition.fieldType === "number"
                              ? "number"
                              : definition.fieldType === "date"
                              ? "date"
                              : "text"
                          }
                          value={customFieldValues[definition.id] ?? ""}
                          onChange={(event) =>
                            setCustomFieldValues((previous) => ({
                              ...previous,
                              [definition.id]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAddingField ? (
                <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="newFieldName">Nom du champ</Label>
                    <Input
                      id="newFieldName"
                      placeholder="Ex. Allergies, numéro de sécurité sociale…"
                      value={newFieldName}
                      onChange={(event) => setNewFieldName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newFieldType">Type de champ</Label>
                    <Select
                      items={CUSTOM_FIELD_TYPE_LABELS}
                      value={newFieldType}
                      onValueChange={(value) => setNewFieldType(value as CustomFieldType)}
                    >
                      <SelectTrigger id="newFieldType" className="w-full">
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
                  </div>

                  {newFieldType === "choice" && (
                    <div className="flex flex-col gap-2">
                      <Label>Options</Label>
                      <div className="flex flex-col gap-2">
                        {newFieldOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(event) =>
                                updateNewFieldOption(index, event.target.value)
                              }
                            />
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => removeNewFieldOption(index)}
                              disabled={newFieldOptions.length <= 2}
                              aria-label="Supprimer cette option"
                            >
                              <TrashIcon size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="self-start"
                        onClick={addNewFieldOption}
                      >
                        <PlusIcon size={14} />
                        Ajouter une option
                      </Button>
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={newFieldAllowMultiple}
                          onCheckedChange={(checked) =>
                            setNewFieldAllowMultiple(checked === true)
                          }
                        />
                        Choix multiple
                      </label>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Ce champ sera disponible pour tous vos patients.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingField(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomField}
                      disabled={isCreatingField || !newFieldName.trim() || !isChoiceFieldValid}
                    >
                      {isCreatingField ? "Création…" : "Ajouter"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start"
                  onClick={() => setIsAddingField(true)}
                >
                  <PlusIcon size={14} />
                  Ajouter un champ personnalisé
                </Button>
              )}
            </div>

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
