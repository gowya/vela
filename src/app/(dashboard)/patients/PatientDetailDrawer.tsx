"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  ConsultationListItem,
  CustomFieldDefinition,
  CustomFieldType,
  Patient,
} from "@/types";
import { calculateAge, isBirthdaySoon } from "@/lib/patient-utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Cf. /ux-copy : "Situation relationnelle" plutôt que "Statut", ambigu hors
// contexte (statut de quoi ?). Liste fermée plutôt que texte libre : ce champ
// alimente aussi une colonne de tableau, où des valeurs libres deviendraient
// vite inexploitables (variantes d'orthographe, etc.).
const RELATIONSHIP_STATUS_OPTIONS = [
  "Célibataire",
  "En couple",
  "Divorcé.e",
  "Crise de couple",
  "En date",
  "Relation libre",
  "Situationship",
] as const;

// Liste fermée pour la même raison que la situation relationnelle. « Couple »
// couvre le cas d'un binôme suivi comme un seul dossier patient (venus à deux
// en séance), pas une identité de genre au sens strict.
const GENDER_IDENTITY_OPTIONS = [
  "Homme",
  "Femme",
  "Non-binaire",
  "Fluide",
  "Couple",
] as const;

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

interface PatientDetailDrawerProps {
  patientId: string | null;
  onClose: () => void;
  onUpdated: (patient: Patient) => void;
  // Ouvre directement avec le focus sur ce champ : utilisé pour les liens qui
  // amènent ici depuis un autre écran avec une intention précise (ex.
  // "planifier le prochain rendez-vous" depuis le tableau de bord ou la liste).
  autoEditField?: keyof EditFormState;
}

export function PatientDetailDrawer({
  patientId,
  onClose,
  onUpdated,
  autoEditField,
}: PatientDetailDrawerProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [customFields, setCustomFields] = useState<PatientDetailField[]>([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<
    CustomFieldDefinition[]
  >([]);
  const [consultations, setConsultations] = useState<ConsultationListItem[] | null>(null);
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
  const autoFocusTriggeredRef = useRef(false);

  useEffect(() => {
    setPatient(null);
    setCustomFields([]);
    setConsultations(null);
    setForm(null);
    setIsAddingField(false);
    setError(null);
    autoFocusTriggeredRef.current = false;

    if (!patientId) return;

    let cancelled = false;

    async function loadPatient() {
      const response = await fetch(`/api/patients/${patientId}`);
      if (!response.ok) {
        if (!cancelled) setError("Impossible de charger ce patient.");
        return;
      }
      const data = await response.json();
      if (cancelled) return;

      const loadedPatient: Patient = data.patient;
      const loadedCustomFields: PatientDetailField[] = data.customFields ?? [];
      setPatient(loadedPatient);
      setCustomFields(loadedCustomFields);
      setForm({
        firstName: loadedPatient.firstName,
        lastName: loadedPatient.lastName,
        email: loadedPatient.email ?? "",
        phone: loadedPatient.phone ?? "",
        birthDate: loadedPatient.birthDate ?? "",
        genderIdentity: loadedPatient.genderIdentity ?? "",
        identifiedIssue: loadedPatient.identifiedIssue ?? "",
        address: loadedPatient.address ?? "",
        status: loadedPatient.status ?? "",
        intakeNotes: loadedPatient.intakeNotes ?? "",
        nextAppointmentAt: toDateTimeLocalValue(loadedPatient.nextAppointmentAt),
      });
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

  // Une fois les définitions de champs personnalisés chargées, initialise leurs
  // valeurs pour ce patient (séparé du chargement du patient lui-même : les deux
  // requêtes sont indépendantes et n'arrivent pas forcément dans le même ordre).
  useEffect(() => {
    if (customFieldDefinitions.length === 0) return;
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
  }, [customFieldDefinitions, customFields]);

  useEffect(() => {
    if (!autoEditField || !form || autoFocusTriggeredRef.current) return;
    autoFocusTriggeredRef.current = true;
    const field = document.getElementById(`edit-${autoEditField}`);
    field?.scrollIntoView({ block: "center" });
    field?.focus();
  }, [autoEditField, form]);

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
    onUpdated(data.patient);
  }

  const open = patientId !== null;
  const age = patient ? calculateAge(patient.birthDate) : null;
  const birthdaySoon = patient ? isBirthdaySoon(patient.birthDate) : false;
  const identitySummary = patient
    ? [patient.genderIdentity, age !== null ? `${age} ans` : null].filter(Boolean).join(" · ")
    : "";

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="truncate">
            {patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}
          </SheetTitle>
          {identitySummary && <SheetDescription>{identitySummary}</SheetDescription>}
        </SheetHeader>

        {error && !form && <p className="p-4 text-sm text-destructive">{error}</p>}
        {!patient && !error && <p className="p-4 text-sm text-muted-foreground">Chargement…</p>}

        {patient && form && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 text-sm">
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
                    {birthdaySoon && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Anniversaire dans les 7 jours
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit-genderIdentity">Identité de genre</Label>
                    <Select
                      items={Object.fromEntries(
                        GENDER_IDENTITY_OPTIONS.map((option) => [option, option])
                      )}
                      value={form.genderIdentity}
                      onValueChange={(value) => updateField("genderIdentity", value ?? "")}
                    >
                      <SelectTrigger id="edit-genderIdentity" className="w-full">
                        <SelectValue placeholder="Non renseignée" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_IDENTITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label htmlFor="edit-status">Situation relationnelle</Label>
                    <Select
                      items={Object.fromEntries(
                        RELATIONSHIP_STATUS_OPTIONS.map((option) => [option, option])
                      )}
                      value={form.status}
                      onValueChange={(value) => updateField("status", value ?? "")}
                    >
                      <SelectTrigger id="edit-status" className="w-full">
                        <SelectValue placeholder="Non renseignée" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            </div>

            <SheetFooter>
              <SheetClose render={<Button type="button" variant="ghost" />}>Fermer</SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
