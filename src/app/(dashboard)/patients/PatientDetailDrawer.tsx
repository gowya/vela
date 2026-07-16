"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import type {
  ConsultationListItem,
  CustomFieldDefinition,
  CustomFieldType,
  Patient,
} from "@/types";
import { calculateAge, isBirthdaySoon } from "@/lib/patient-utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, ComboboxMultiple } from "@/components/ui/combobox";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { NewConsultationDialog } from "@/app/(dashboard)/consultations/NewConsultationDialog";
import {
  AddressBookIcon,
  CalendarCheckIcon,
  DotsSixVerticalIcon,
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

// Champ personnalisé réordonnable (drag & drop) dans sa section dédiée du
// drawer, avec suppression individuelle — le contrôle de saisie varie selon
// le type de champ (choix simple/multiple, texte, nombre, date).
function SortableCustomField({
  definition,
  value,
  onValueChange,
  onDelete,
}: {
  definition: CustomFieldDefinition;
  value: string;
  onValueChange: (value: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: definition.id,
  });

  const isWide = definition.fieldType === "choice" && definition.allowMultiple;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={isWide ? "col-span-2" : undefined}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={`edit-custom-${definition.id}`} className="mb-0">
          {definition.fieldName}
        </Label>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Déplacer le champ ${definition.fieldName}`}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <DotsSixVerticalIcon size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Supprimer le champ ${definition.fieldName}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <TrashIcon size={12} />
          </button>
        </div>
      </div>

      {definition.fieldType === "choice" ? (
        definition.allowMultiple ? (
          <ComboboxMultiple
            id={`edit-custom-${definition.id}`}
            label={definition.fieldName}
            hideLabel
            options={(definition.options ?? []).map((option) => ({ value: option, label: option }))}
            value={parseChoiceValue(value, true)}
            onValueChange={(values) => onValueChange(JSON.stringify(values))}
            placeholder="Sélectionner…"
          />
        ) : (
          <Combobox
            id={`edit-custom-${definition.id}`}
            label={definition.fieldName}
            hideLabel
            options={(definition.options ?? []).map((option) => ({ value: option, label: option }))}
            value={value || null}
            onValueChange={(next) => onValueChange(next ?? "")}
            placeholder="Sélectionner…"
          />
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
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
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
  // Suppression du patient depuis le drawer lui-même (retour test user #01,
  // P2) : même système que le menu contextuel de la liste des patients, en
  // parallèle plutôt qu'en remplacement. Optionnel : les appelants qui ne
  // maintiennent pas de liste locale à nettoyer peuvent l'omettre.
  onDeleted?: (patientId: string) => void;
  // "overlay" (défaut) : panneau Sheet classique, superposé au reste de la
  // page. "inline" : même contenu, sans overlay ni backdrop, pensé pour vivre
  // à côté d'un autre contenu interactif (ex. la consultation) — l'utilisateur
  // doit pouvoir agir sur les deux en même temps (retour test user #01, C4).
  variant?: "overlay" | "inline";
}

export function PatientDetailDrawer({
  patientId,
  onClose,
  onUpdated,
  autoEditField,
  onDeleted,
  variant = "overlay",
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
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);
  const [isDeletingField, setIsDeletingField] = useState(false);
  const [confirmDeletePatientOpen, setConfirmDeletePatientOpen] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const autoFocusTriggeredRef = useRef(false);
  // Dernier état connu comme enregistré (chargement initial ou sauvegarde
  // réussie) : sert de référence pour détecter des modifications non
  // enregistrées avant de fermer le drawer.
  const pristineFormRef = useRef<EditFormState | null>(null);
  const pristineCustomFieldValuesRef = useRef<Record<string, string>>({});

  const fieldDragSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, {})
  );

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCustomFieldDefinitions((previous) => {
      const oldIndex = previous.findIndex((definition) => definition.id === active.id);
      const newIndex = previous.findIndex((definition) => definition.id === over.id);
      const reordered = arrayMove(previous, oldIndex, newIndex);

      fetch("/api/custom-fields", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((definition) => definition.id) }),
      }).catch(() => {
        toast.error("Le réordonnancement des champs a échoué.");
      });

      return reordered;
    });
  }

  async function handleDeleteFieldConfirmed() {
    if (!fieldToDelete) return;
    setIsDeletingField(true);
    const response = await fetch(`/api/custom-fields/${fieldToDelete.id}`, {
      method: "DELETE",
    });
    setIsDeletingField(false);

    if (!response.ok) {
      toast.error("La suppression du champ a échoué.");
      return;
    }

    setCustomFieldDefinitions((previous) =>
      previous.filter((definition) => definition.id !== fieldToDelete.id)
    );
    setCustomFieldValues((previous) => {
      const { [fieldToDelete.id]: _removed, ...rest } = previous;
      return rest;
    });
    toast.success("Champ personnalisé supprimé.");
    setFieldToDelete(null);
  }

  async function handleDeletePatientConfirmed() {
    if (!patient) return;
    setIsDeletingPatient(true);
    const response = await fetch(`/api/patients/${patient.id}`, { method: "DELETE" });
    setIsDeletingPatient(false);

    if (!response.ok) {
      toast.error("La suppression du patient a échoué.");
      return;
    }

    toast.success("Patient supprimé.");
    setConfirmDeletePatientOpen(false);
    onDeleted?.(patient.id);
    onClose();
  }

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
      const loadedForm: EditFormState = {
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
      };
      setForm(loadedForm);
      pristineFormRef.current = loadedForm;
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
    const nextValues = Object.fromEntries(
      customFieldDefinitions.map((definition) => [
        definition.id,
        existingValues[definition.id] ?? "",
      ])
    );
    setCustomFieldValues(nextValues);
    pristineCustomFieldValuesRef.current = nextValues;
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
    const updatedCustomFields: PatientDetailField[] = data.customFields ?? [];
    setPatient(data.patient);
    setCustomFields(updatedCustomFields);
    pristineFormRef.current = form;
    // La liste des patients affiche les champs personnalisés en colonnes : on
    // lui transmet leurs valeurs à jour, sinon elle resterait sur les valeurs
    // chargées à l'ouverture du drawer jusqu'au prochain rechargement complet.
    onUpdated({
      ...data.patient,
      customFieldValues: Object.fromEntries(
        updatedCustomFields.map((field) => [field.fieldDefinitionId, field.value ?? ""])
      ),
    });
    // Cliquer sur Enregistrer signifie que l'utilisateur a terminé : on ferme
    // le drawer plutôt que de le laisser ouvert sur les données à jour.
    onClose();
  }

  const open = patientId !== null;
  const age = patient ? calculateAge(patient.birthDate) : null;
  const birthdaySoon = patient ? isBirthdaySoon(patient.birthDate) : false;
  const identitySummary = patient
    ? [patient.genderIdentity, age !== null ? `${age} ans` : null].filter(Boolean).join(" · ")
    : "";

  const isDirty =
    form !== null &&
    (JSON.stringify(form) !== JSON.stringify(pristineFormRef.current) ||
      JSON.stringify(customFieldValues) !== JSON.stringify(pristineCustomFieldValuesRef.current));

  function requestClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }

  function handleDiscardConfirmed() {
    setShowDiscardConfirm(false);
    onClose();
  }

  const panelContent = (
    <>
        <div className="flex flex-row items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate font-heading text-sm font-medium text-foreground">
              {patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}
            </h2>
            {identitySummary && (
              <p className="text-xs/relaxed text-muted-foreground">{identitySummary}</p>
            )}
          </div>
          {patient && form && (
            <div className="flex shrink-0 items-center gap-2">
              {variant === "inline" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fermer"
                  onClick={requestClose}
                >
                  <XIcon size={16} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Supprimer le patient"
                onClick={() => setConfirmDeletePatientOpen(true)}
              >
                <TrashIcon size={16} />
              </Button>
              {isDirty && (
                <Button type="button" variant="ghost" onClick={requestClose}>
                  Annuler les modifications
                </Button>
              )}
              <Button type="submit" form="patient-edit-form" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          )}
        </div>

        {error && !form && <p className="p-4 text-sm text-destructive">{error}</p>}
        {!patient && !error && (
          <div className="flex flex-1 flex-col gap-5 overflow-hidden p-4">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-3 w-20" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7" />
              <Skeleton className="h-7" />
            </div>
          </div>
        )}

        {patient && form && (
          <form
            id="patient-edit-form"
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
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
                    <DatePicker
                      id="edit-birthDate"
                      label="Date de naissance"
                      value={form.birthDate}
                      onValueChange={(value) => updateField("birthDate", value)}
                    />
                    {birthdaySoon && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Anniversaire dans les 7 jours
                      </p>
                    )}
                  </div>
                  <div>
                    <Combobox
                      id="edit-genderIdentity"
                      label="Identité de genre"
                      options={GENDER_IDENTITY_OPTIONS.map((option) => ({ value: option, label: option }))}
                      value={form.genderIdentity || null}
                      onValueChange={(value) => updateField("genderIdentity", value ?? "")}
                      placeholder="Non renseignée"
                    />
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
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-identifiedIssue">Problématique identifiée</Label>
                    <Input
                      id="edit-identifiedIssue"
                      value={form.identifiedIssue}
                      onChange={(event) => updateField("identifiedIssue", event.target.value)}
                    />
                  </div>
                  <div>
                    <Combobox
                      id="edit-status"
                      label="Situation relationnelle"
                      options={RELATIONSHIP_STATUS_OPTIONS.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                      value={form.status || null}
                      onValueChange={(value) => updateField("status", value ?? "")}
                      placeholder="Non renseignée"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Dernier rendez-vous</Label>
                    <p className="flex h-7 items-center text-muted-foreground">
                      {formatDate(patient.lastAppointmentAt)}
                    </p>
                  </div>
                  <div>
                    <DateTimePicker
                      id="edit-nextAppointmentAt"
                      label="Prochain rendez-vous"
                      value={form.nextAppointmentAt}
                      onValueChange={(value) => updateField("nextAppointmentAt", value)}
                      disablePast
                    />
                  </div>
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
                  <DndContext
                    sensors={fieldDragSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleFieldDragEnd}
                  >
                    <SortableContext
                      items={customFieldDefinitions.map((definition) => definition.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {customFieldDefinitions.map((definition) => (
                          <SortableCustomField
                            key={definition.id}
                            definition={definition}
                            value={customFieldValues[definition.id] ?? ""}
                            onValueChange={(value) =>
                              setCustomFieldValues((previous) => ({
                                ...previous,
                                [definition.id]: value,
                              }))
                            }
                            onDelete={() => setFieldToDelete(definition)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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
                      <Combobox
                        id="newFieldType"
                        label="Type de champ"
                        options={Object.entries(CUSTOM_FIELD_TYPE_LABELS).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        value={newFieldType}
                        onValueChange={(value) => setNewFieldType(value as CustomFieldType)}
                      />
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
          </form>
        )}
    </>
  );

  return (
    <>
    {variant === "overlay" ? (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
      >
        <SheetContent side="right" className="flex flex-col p-0 sm:max-w-lg" showCloseButton={false}>
          {panelContent}
        </SheetContent>
      </Sheet>
    ) : (
      open && (
        <div className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground">
          {panelContent}
        </div>
      )
    )}

    <Dialog
      open={fieldToDelete !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setFieldToDelete(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce champ personnalisé ?</DialogTitle>
          <DialogDescription>
            {fieldToDelete &&
              `« ${fieldToDelete.fieldName} » et sa valeur pour tous vos patients seront définitivement supprimés. Cette action est irréversible.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setFieldToDelete(null)}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeletingField}
            onClick={() => void handleDeleteFieldConfirmed()}
          >
            {isDeletingField ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={confirmDeletePatientOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setConfirmDeletePatientOpen(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce patient ?</DialogTitle>
          <DialogDescription>
            {patient &&
              `${patient.firstName} ${patient.lastName} et l'ensemble de ses consultations seront définitivement supprimés. Cette action est irréversible.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDeletePatientOpen(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeletingPatient}
            onClick={() => void handleDeletePatientConfirmed()}
          >
            {isDeletingPatient ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abandonner les modifications ?</DialogTitle>
          <DialogDescription>
            Ce patient a des modifications non enregistrées. Si vous fermez maintenant, elles
            seront perdues.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowDiscardConfirm(false)}>
            Continuer l&apos;édition
          </Button>
          <Button type="button" variant="destructive" onClick={handleDiscardConfirmed}>
            Abandonner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
