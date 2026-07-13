"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnOrderState,
  type Header,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  ColumnsIcon,
  CopyIcon,
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { CustomFieldDefinition, Patient } from "@/types";
import { calculateAge, isBirthdaySoon } from "@/lib/patient-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddPatientDialog } from "./AddPatientDialog";
import { PatientDetailDrawer } from "./PatientDetailDrawer";

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

// Même format heure+date que les cartes de rendez-vous du tableau de bord :
// cette liste est aussi un endroit où vérifier l'heure exacte d'un rendez-vous.
function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const day = date.toLocaleDateString("fr-FR");
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}

// Le nom reste toujours en première colonne : épinglé, non masquable, non
// déplaçable. Tout le reste est une propriété que le praticien peut choisir
// d'afficher ou non, et réordonner à la souris — préférence mémorisée par
// praticien dans le navigateur (les notes de prise en charge n'en font pas
// partie : trop longues pour une cellule, elles restent dans la fiche).
const OPTIONAL_COLUMN_IDS = [
  "identifiedIssue",
  "status",
  "nextAppointmentAt",
  "age",
  "genderIdentity",
  "email",
  "phone",
  "address",
  "birthDate",
  "lastAppointmentAt",
  "createdAt",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  name: "Nom",
  identifiedIssue: "Problématique",
  status: "Situation relationnelle",
  nextAppointmentAt: "Prochain rendez-vous",
  age: "Âge",
  genderIdentity: "Identité de genre",
  email: "Email",
  phone: "Téléphone",
  address: "Adresse",
  birthDate: "Date de naissance",
  lastAppointmentAt: "Dernier rendez-vous",
  createdAt: "Patient depuis",
};

const DEFAULT_COLUMN_ORDER: ColumnOrderState = ["name", ...OPTIONAL_COLUMN_IDS];

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  identifiedIssue: true,
  status: true,
  nextAppointmentAt: true,
  age: false,
  genderIdentity: false,
  email: false,
  phone: false,
  address: false,
  birthDate: false,
  lastAppointmentAt: false,
  createdAt: false,
};

const COLUMN_PREFS_STORAGE_KEY = "vela:patients-table-columns";

// Les champs personnalisés du praticien deviennent des colonnes au même titre
// que les propriétés de base, préfixées pour ne jamais entrer en collision
// avec un id de colonne existant.
const CUSTOM_COLUMN_PREFIX = "custom:";

function customColumnId(definitionId: string): string {
  return `${CUSTOM_COLUMN_PREFIX}${definitionId}`;
}

function getColumnLabel(id: string, customFieldDefinitions: CustomFieldDefinition[]): string {
  if (COLUMN_LABELS[id]) return COLUMN_LABELS[id];
  if (id.startsWith(CUSTOM_COLUMN_PREFIX)) {
    const definitionId = id.slice(CUSTOM_COLUMN_PREFIX.length);
    return (
      customFieldDefinitions.find((definition) => definition.id === definitionId)?.fieldName ?? id
    );
  }
  return id;
}

// Pour un champ à choix multiple, la valeur est stockée en JSON (tableau de
// chaînes) — cf. PatientDetailDrawer.tsx.
function formatCustomFieldValue(value: string, definition: CustomFieldDefinition): string {
  if (definition.fieldType === "choice" && definition.allowMultiple) {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed.join(", ") : value;
    } catch {
      return value;
    }
  }
  return value;
}

// Références stables : dnd-kit garde ses écouteurs natifs branchés tant que
// ces valeurs ne changent pas d'identité — recréées à chaque rendu (littéraux
// inline), elles font annuler un glisser-déposer en cours avant qu'il aboutisse.
const DND_MODIFIERS = [restrictToHorizontalAxis];
const MOUSE_ACTIVATION_CONSTRAINT = { distance: 8 };
const TOUCH_ACTIVATION_CONSTRAINT = { delay: 150, tolerance: 5 };

interface ColumnPrefs {
  order: ColumnOrderState;
  visibility: VisibilityState;
}

function loadColumnPrefs(): ColumnPrefs | null {
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.order) || typeof parsed.visibility !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

// Poignée de tri + glisser-déposer pour une colonne facultative.
function DraggableTableHead({ header, label }: { header: Header<Patient, unknown>; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  });

  const sorted = header.column.getIsSorted();

  return (
    <TableHead
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: "relative",
      }}
      className="select-none"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Déplacer la colonne ${label}`}
          className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <DotsSixVerticalIcon size={12} />
        </button>
        <button
          type="button"
          onClick={header.column.getToggleSortingHandler()}
          className="flex min-w-0 items-center gap-1 hover:text-foreground"
        >
          <span className="truncate">{label}</span>
          {sorted === "asc" ? (
            <CaretUpIcon size={12} />
          ) : sorted === "desc" ? (
            <CaretDownIcon size={12} />
          ) : (
            <CaretUpDownIcon size={12} className="opacity-40" />
          )}
        </button>
      </div>
    </TableHead>
  );
}

// Colonne "Nom" : sortable comme les autres, mais épinglée à gauche et jamais
// déplaçable (pas de useSortable ici).
function PinnedTableHead({ header }: { header: Header<Patient, unknown> }) {
  const sorted = header.column.getIsSorted();

  return (
    <TableHead className="sticky left-0 z-20 border-r border-border bg-card select-none">
      <button
        type="button"
        onClick={header.column.getToggleSortingHandler()}
        className="flex items-center gap-1 hover:text-foreground"
      >
        Nom
        {sorted === "asc" ? (
          <CaretUpIcon size={12} />
        ) : sorted === "desc" ? (
          <CaretDownIcon size={12} />
        ) : (
          <CaretUpDownIcon size={12} className="opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

// Planification rapide du prochain rendez-vous directement depuis la ligne du
// tableau : ouvre le date picker sur place plutôt que la fiche patient
// complète. `stopPropagation` partout dans le popover pour ne pas déclencher
// le clic de ligne (React fait remonter les événements des portails via
// l'arbre React, pas le DOM).
function NextAppointmentQuickPicker({
  patient,
  onSaved,
}: {
  patient: Patient;
  onSaved: (patient: Patient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("00:00");
  const [isSaving, setIsSaving] = useState(false);

  // Choisir une date ne ferme plus le popover : l'utilisateur doit encore
  // ajuster l'heure (ou corriger la date) avant de confirmer. Fermer
  // automatiquement forçait à rouvrir le picker pour la moindre correction.
  function handleSelectDate(date: Date | undefined) {
    setSelectedDate(date);
  }

  async function handleConfirm() {
    if (!selectedDate) return;
    setIsSaving(true);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localValue = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${time}`;
    const response = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextAppointmentAt: new Date(localValue).toISOString() }),
    });
    setIsSaving(false);

    if (!response.ok) {
      toast.error("La planification du rendez-vous a échoué.");
      return;
    }

    const data = await response.json();
    onSaved(data.patient);
    setOpen(false);
    setSelectedDate(undefined);
    toast.success("Rendez-vous planifié.");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-row-click-ignore
        className="text-primary hover:underline focus-visible:outline-none focus-visible:underline"
      >
        {isSaving ? "Planification…" : "Planifier un rendez-vous"}
      </PopoverTrigger>
      <PopoverContent data-row-click-ignore className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selectedDate}
          onSelect={handleSelectDate}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Label htmlFor={`next-appointment-time-${patient.id}`} className="text-xs text-muted-foreground">
              Heure
            </Label>
            <Input
              id={`next-appointment-time-${patient.id}`}
              type="time"
              className="h-7 w-auto"
              value={time}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!selectedDate || isSaving}
            onClick={handleConfirm}
          >
            {isSaving ? "Planification…" : "Planifier"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PatientsList() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams.get("patientId")
  );
  // Champ à ouvrir directement en édition, que ce soit depuis un lien externe
  // (ex. le nudge du tableau de bord) ou depuis le CTA "Planifier un rendez-vous"
  // affiché sur chaque ligne patient sans prochain rendez-vous.
  const [autoEditField, setAutoEditField] = useState<"nextAppointmentAt" | undefined>(
    searchParams.get("edit") === "nextAppointmentAt" ? "nextAppointmentAt" : undefined
  );
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDuplicate(patient: Patient) {
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: patient.firstName,
        lastName: `${patient.lastName} (copie)`,
        email: patient.email,
        phone: patient.phone,
      }),
    });

    if (!response.ok) {
      toast.error("La duplication du patient a échoué.");
      return;
    }

    const data = await response.json();
    setPatients((previous) => [...(previous ?? []), data.patient]);
    toast.success("Patient dupliqué", {
      description: `${data.patient.firstName} ${data.patient.lastName} a été créé.`,
      action: {
        label: "Voir la fiche",
        onClick: () => setSelectedPatientId(data.patient.id),
      },
    });
  }

  async function handleDeleteConfirmed() {
    if (!patientToDelete) return;
    setIsDeleting(true);
    const response = await fetch(`/api/patients/${patientToDelete.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);

    if (!response.ok) {
      toast.error("La suppression du patient a échoué.");
      return;
    }

    setPatients((previous) => previous?.filter((p) => p.id !== patientToDelete.id) ?? previous);
    if (selectedPatientId === patientToDelete.id) {
      setSelectedPatientId(null);
    }
    toast.success("Patient supprimé.");
    setPatientToDelete(null);
  }

  // La liste ne remonte pas quand on navigue vers elle-même avec un nouveau
  // patientId (ex. CTA « Voir la fiche » d'un toast déclenché depuis cette
  // même page) : l'état initialisé une seule fois via useState ne suffit
  // pas, il faut aussi resynchroniser à chaque changement d'URL.
  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (patientId && patientId !== selectedPatientId) {
      setSelectedPatientId(patientId);
      setAutoEditField(
        searchParams.get("edit") === "nextAppointmentAt" ? "nextAppointmentAt" : undefined
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const hasHydratedPrefs = useRef(false);

  // Charge les préférences de colonnes sauvegardées après le montage (accès
  // localStorage impossible côté serveur), puis les persiste à chaque
  // changement une fois l'hydratation initiale faite.
  useEffect(() => {
    const saved = loadColumnPrefs();
    if (saved) {
      setColumnOrder(saved.order);
      setColumnVisibility(saved.visibility);
    }
    hasHydratedPrefs.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedPrefs.current) return;
    window.localStorage.setItem(
      COLUMN_PREFS_STORAGE_KEY,
      JSON.stringify({ order: columnOrder, visibility: columnVisibility })
    );
  }, [columnOrder, columnVisibility]);

  useEffect(() => {
    let cancelled = false;

    async function loadPatients() {
      const response = await fetch("/api/patients");
      if (!response.ok) {
        if (!cancelled) setError("Impossible de charger la liste des patients.");
        return;
      }
      const data = await response.json();
      if (!cancelled) setPatients(data.patients);
    }

    loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomFieldDefinitions() {
      const response = await fetch("/api/custom-fields");
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setCustomFieldDefinitions(data.customFields ?? []);
    }

    loadCustomFieldDefinitions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ajoute les champs personnalisés pas encore connus (nouveau champ créé
  // depuis une autre session, ou tout premier chargement sans préférences
  // sauvegardées) à l'ordre et à la visibilité des colonnes, sans jamais
  // écraser un choix déjà fait par le praticien.
  useEffect(() => {
    if (customFieldDefinitions.length === 0) return;

    setColumnOrder((current) => {
      const missing = customFieldDefinitions
        .map((definition) => customColumnId(definition.id))
        .filter((id) => !current.includes(id));
      return missing.length > 0 ? [...current, ...missing] : current;
    });

    setColumnVisibility((current) => {
      const additions: VisibilityState = {};
      let changed = false;
      for (const definition of customFieldDefinitions) {
        const id = customColumnId(definition.id);
        if (!(id in current)) {
          additions[id] = definition.showInTable;
          changed = true;
        }
      }
      return changed ? { ...current, ...additions } : current;
    });
  }, [customFieldDefinitions]);

  const columns = useMemo<ColumnDef<Patient>[]>(
    () => [
      {
        id: "name",
        accessorFn: (patient) => `${patient.firstName} ${patient.lastName}`,
        enableHiding: false,
        cell: ({ row }) => {
          const patient = row.original;
          const birthdaySoon = isBirthdaySoon(patient.birthDate);
          return (
            <div className="flex items-center gap-2 font-medium text-foreground">
              {patient.firstName} {patient.lastName}
              {birthdaySoon && (
                <span className="text-xs font-normal text-primary">Anniversaire proche</span>
              )}
            </div>
          );
        },
      },
      {
        id: "identifiedIssue",
        accessorFn: (patient) => patient.identifiedIssue ?? "",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.identifiedIssue ?? "Problématique non renseignée"}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (patient) => patient.status ?? "",
        cell: ({ row }) => row.original.status ?? "—",
      },
      {
        id: "nextAppointmentAt",
        accessorFn: (patient) => (patient.nextAppointmentAt ? new Date(patient.nextAppointmentAt) : null),
        cell: ({ row }) => {
          const patient = row.original;
          if (patient.nextAppointmentAt) {
            return (
              <span className="text-muted-foreground">{formatDateTime(patient.nextAppointmentAt)}</span>
            );
          }
          return (
            <NextAppointmentQuickPicker
              patient={patient}
              onSaved={(updatedPatient) =>
                setPatients(
                  (previous) =>
                    previous?.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)) ??
                    previous
                )
              }
            />
          );
        },
      },
      {
        id: "age",
        accessorFn: (patient) => calculateAge(patient.birthDate) ?? -1,
        cell: ({ row }) => {
          const age = calculateAge(row.original.birthDate);
          return age !== null ? `${age} ans` : "—";
        },
      },
      {
        id: "genderIdentity",
        accessorFn: (patient) => patient.genderIdentity ?? "",
        cell: ({ row }) => row.original.genderIdentity ?? "—",
      },
      {
        id: "email",
        accessorFn: (patient) => patient.email ?? "",
        cell: ({ row }) => row.original.email ?? "—",
      },
      {
        id: "phone",
        accessorFn: (patient) => patient.phone ?? "",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        id: "address",
        accessorFn: (patient) => patient.address ?? "",
        cell: ({ row }) => row.original.address ?? "—",
      },
      {
        id: "birthDate",
        accessorFn: (patient) => patient.birthDate ?? "",
        cell: ({ row }) => formatDate(row.original.birthDate),
      },
      {
        id: "lastAppointmentAt",
        accessorFn: (patient) => (patient.lastAppointmentAt ? new Date(patient.lastAppointmentAt) : null),
        cell: ({ row }) => formatDateTime(row.original.lastAppointmentAt),
      },
      {
        id: "createdAt",
        accessorFn: (patient) => new Date(patient.createdAt),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      ...customFieldDefinitions.map(
        (definition): ColumnDef<Patient> => ({
          id: customColumnId(definition.id),
          accessorFn: (patient) =>
            formatCustomFieldValue(patient.customFieldValues?.[definition.id] ?? "", definition),
          cell: ({ row }) => {
            const value = formatCustomFieldValue(
              row.original.customFieldValues?.[definition.id] ?? "",
              definition
            );
            return <span className="text-muted-foreground">{value || "—"}</span>;
          },
        })
      ),
    ],
    [customFieldDefinitions]
  );

  const table = useReactTable({
    data: patients ?? [],
    columns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (patient) => patient.id,
  });

  const draggableColumnIds = useMemo(
    () => columnOrder.filter((id) => id !== "name"),
    [columnOrder]
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: MOUSE_ACTIVATION_CONSTRAINT }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_ACTIVATION_CONSTRAINT }),
    useSensor(KeyboardSensor, {})
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder((current) => {
      const rest = current.filter((id) => id !== "name");
      const oldIndex = rest.indexOf(active.id as string);
      const newIndex = rest.indexOf(over.id as string);
      return ["name", ...arrayMove(rest, oldIndex, newIndex)];
    });
  }, []);

  const headerGroup = table.getHeaderGroups()[0];
  const nameHeader = headerGroup?.headers.find((header) => header.column.id === "name");
  const otherHeaders = headerGroup?.headers.filter((header) => header.column.id !== "name") ?? [];

  return (
    <main className="flex min-h-screen min-w-0 flex-col gap-6 px-16 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
          {patients !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <UsersIcon size={14} />
              {patients.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <ColumnsIcon size={14} />
              Colonnes
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                ...OPTIONAL_COLUMN_IDS,
                ...customFieldDefinitions.map((definition) => customColumnId(definition.id)),
              ].map((id) => {
                const column = table.getColumn(id);
                if (!column) return null;
                return (
                  <DropdownMenuCheckboxItem
                    key={id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                  >
                    {getColumnLabel(id, customFieldDefinitions)}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <AddPatientDialog
            onCreated={(patient) => setPatients((previous) => [...(previous ?? []), patient])}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {patients === null && !error && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center gap-6 border-b border-border p-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-6 border-b border-border p-2 last:border-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      )}

      {patients?.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun patient pour le moment</EmptyTitle>
            <EmptyDescription>
              Ajoutez votre premier patient pour commencer à suivre sa prise en charge.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddPatientDialog
              onCreated={(patient) => setPatients((previous) => [...(previous ?? []), patient])}
            />
          </EmptyContent>
        </Empty>
      )}

      {patients !== null && patients.length > 0 && (
        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={DND_MODIFIERS}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {nameHeader && <PinnedTableHead header={nameHeader} />}
                  <SortableContext items={draggableColumnIds} strategy={horizontalListSortingStrategy}>
                    {otherHeaders.map((header) => (
                      <DraggableTableHead
                        key={header.id}
                        header={header}
                        label={getColumnLabel(header.column.id, customFieldDefinitions)}
                      />
                    ))}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <ContextMenu key={row.id}>
                    <ContextMenuTrigger
                      render={
                        <TableRow
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest("[data-row-click-ignore]")) {
                              return;
                            }
                            setAutoEditField(undefined);
                            setSelectedPatientId(row.original.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setAutoEditField(undefined);
                              setSelectedPatientId(row.original.id);
                            }
                          }}
                          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                        />
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "name"
                              ? "sticky left-0 z-10 border-r border-border bg-card"
                              : undefined
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          setAutoEditField(undefined);
                          setSelectedPatientId(row.original.id);
                        }}
                      >
                        <PencilSimpleIcon size={14} />
                        Modifier
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => void handleDuplicate(row.original)}>
                        <CopyIcon size={14} />
                        Dupliquer
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => setPatientToDelete(row.original)}
                      >
                        <TrashIcon size={14} />
                        Supprimer
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      )}

      <PatientDetailDrawer
        patientId={selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
        onUpdated={(updatedPatient) =>
          setPatients(
            (previous) =>
              previous?.map((patient) =>
                patient.id === updatedPatient.id ? updatedPatient : patient
              ) ?? previous
          )
        }
        autoEditField={selectedPatientId ? autoEditField : undefined}
      />

      <Dialog
        open={patientToDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPatientToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce patient ?</DialogTitle>
            <DialogDescription>
              {patientToDelete &&
                `${patientToDelete.firstName} ${patientToDelete.lastName} et l'ensemble de ses consultations seront définitivement supprimés. Cette action est irréversible.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPatientToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDeleteConfirmed()}
            >
              {isDeleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
