"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ClipboardTextIcon, MagnifyingGlassIcon, TrashIcon } from "@phosphor-icons/react";
import type { ConsultationListItem } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { NewConsultationDialog } from "./NewConsultationDialog";
import { TemplatesManagerDialog } from "./TemplatesManagerDialog";
import { PatientDetailDrawer } from "../patients/PatientDetailDrawer";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { FieldError } from "@/components/ui/field";
import { SortableTableHead } from "@/components/SortableTableHead";
import { applyTableSort, type TableSort } from "@/lib/table-sort";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Un seul label par consultation, jamais dupliqué : le titre saisi s'il existe,
// sinon le nom du modèle de départ, sinon un fallback neutre.
function consultationLabel(consultation: ConsultationListItem): string {
  return consultation.title ?? consultation.templateName ?? "Sans titre";
}

type ConsultationRowActions = {
  onPatientClick: (patientId: string) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRequestDelete: (consultation: ConsultationListItem) => void;
};

function ConsultationRow({
  consultation,
  showPatient,
  onPatientClick,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onRequestDelete,
}: ConsultationRowActions & {
  consultation: ConsultationListItem;
  showPatient: boolean;
}) {
  const router = useRouter();

  function openConsultation() {
    if (selectionMode) {
      onToggleSelect(consultation.id);
      return;
    }
    router.push(`/consultations/${consultation.id}`);
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          // Pas de <Link> englobant : le nom du patient a besoin de son propre
          // élément cliquable (ouvrir ses infos sans quitter la liste, retour
          // test user #01, P3), et un <button> imbriqué dans un <a> serait
          // invalide.
          <TableRow
            role="button"
            tabIndex={0}
            onClick={openConsultation}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openConsultation();
              }
            }}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        }
      >
        {selectionMode && (
          <TableCell className="w-8">
            <span onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={selectedIds.has(consultation.id)}
                onCheckedChange={() => onToggleSelect(consultation.id)}
                aria-label="Sélectionner cette consultation"
              />
            </span>
          </TableCell>
        )}
        {/* Le patient est l'information principale de la ligne : c'est lui
            qu'on cherche, pas le type de séance. */}
        {showPatient && (
          <TableCell>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPatientClick(consultation.patientId);
              }}
              className="font-medium text-foreground hover:underline"
            >
              {consultation.patientFirstName} {consultation.patientLastName}
            </button>
          </TableCell>
        )}
        <TableCell className={showPatient ? undefined : "font-medium"}>
          {consultationLabel(consultation)}
        </TableCell>
        <TableCell className="w-full max-w-0 truncate text-muted-foreground">
          {consultation.excerpt}
        </TableCell>
        <TableCell className="text-right font-mono text-muted-foreground">
          {formatDate(consultation.date)}
        </TableCell>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem variant="destructive" onClick={() => onRequestDelete(consultation)}>
          <TrashIcon size={14} />
          Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

type ConsultationSortKey = "patient" | "label" | "date";

const CONSULTATION_SORT_VALUES: Record<
  ConsultationSortKey,
  (consultation: ConsultationListItem) => string | number
> = {
  patient: (consultation) => `${consultation.patientFirstName} ${consultation.patientLastName}`,
  label: consultationLabel,
  date: (consultation) => new Date(consultation.date).getTime(),
};

// Même cadre que les tableaux Patients et Rendez-vous. Sans tri choisi, on
// garde l'ordre de l'API (date décroissante).
function ConsultationsTable({
  consultations,
  showPatient,
  sort,
  onSortChange,
  ...actions
}: ConsultationRowActions & {
  consultations: ConsultationListItem[];
  showPatient: boolean;
  sort: TableSort<ConsultationSortKey>;
  onSortChange: (sort: TableSort<ConsultationSortKey>) => void;
}) {
  const sortProps = { sort, onSortChange };

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {actions.selectionMode && (
              <TableHead className="w-8">
                <span className="sr-only">Sélection</span>
              </TableHead>
            )}
            {showPatient && <SortableTableHead label="Patient" sortKey="patient" {...sortProps} />}
            <SortableTableHead label="Séance" sortKey="label" {...sortProps} />
            <TableHead>Aperçu</TableHead>
            <SortableTableHead label="Date" sortKey="date" className="text-right" {...sortProps} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {applyTableSort(consultations, sort, CONSULTATION_SORT_VALUES).map((consultation) => (
            <ConsultationRow
              key={consultation.id}
              consultation={consultation}
              showPatient={showPatient}
              {...actions}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Regroupe les consultations par patient en conservant l'ordre d'arrivée (déjà
// trié par date décroissante côté API) : le patient avec la consultation la plus
// récente apparaît en premier.
function groupByPatient(consultations: ConsultationListItem[]) {
  const groups = new Map<
    string,
    { patientId: string; patientName: string; items: ConsultationListItem[] }
  >();
  for (const consultation of consultations) {
    const existing = groups.get(consultation.patientId);
    if (existing) {
      existing.items.push(consultation);
    } else {
      groups.set(consultation.patientId, {
        patientId: consultation.patientId,
        patientName: `${consultation.patientFirstName} ${consultation.patientLastName}`,
        items: [consultation],
      });
    }
  }
  return Array.from(groups.values());
}

type DeleteRequest =
  | { kind: "single"; consultation: ConsultationListItem }
  | { kind: "bulk"; ids: string[] };

export function ConsultationsList() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [consultations, setConsultations] = useState<ConsultationListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("basic");
  const [sort, setSort] = useState<TableSort<ConsultationSortKey>>(null);
  const [error, setError] = useState<string | null>(null);
  // Infos patient "à portée de main" sans quitter la liste des consultations
  // (retour test user #01, P3) : réutilise le même drawer que la page Patients.
  const [openPatientId, setOpenPatientId] = useState<string | null>(null);
  // Suppression contextuelle et en masse (retour test user #01, C5/C6).
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteConfirmed() {
    if (!deleteRequest) return;
    const ids = deleteRequest.kind === "single" ? [deleteRequest.consultation.id] : deleteRequest.ids;

    setIsDeleting(true);
    const results = await Promise.all(
      ids.map((id) => fetch(`/api/consultations/${id}`, { method: "DELETE" }))
    );
    setIsDeleting(false);

    const succeededIds = ids.filter((_, index) => results[index].ok);
    const failedCount = ids.length - succeededIds.length;

    if (succeededIds.length > 0) {
      setConsultations(
        (previous) => previous?.filter((c) => !succeededIds.includes(c.id)) ?? previous
      );
      setSelectedIds((previous) => {
        const next = new Set(previous);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (failedCount > 0) {
      toast.error(
        ids.length === 1
          ? "La suppression de la consultation a échoué."
          : `${failedCount} suppression${failedCount > 1 ? "s" : ""} ont échoué.`
      );
    } else {
      toast.success(ids.length === 1 ? "Consultation supprimée." : "Consultations supprimées.");
      if (deleteRequest.kind === "bulk") setSelectionMode(false);
    }

    setDeleteRequest(null);
  }

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (patientId) params.set("patientId", patientId);

      fetch(`/api/consultations?${params.toString()}`)
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
        .then((data) => {
          if (!cancelled) setConsultations(data.consultations);
        })
        .catch(() => {
          if (!cancelled) setError("Impossible de charger les consultations.");
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, patientId]);

  const isEmpty = consultations?.length === 0;
  const rowActions: ConsultationRowActions = {
    onPatientClick: setOpenPatientId,
    selectionMode,
    selectedIds,
    onToggleSelect: toggleSelected,
    onRequestDelete: (target) => setDeleteRequest({ kind: "single", consultation: target }),
  };
  const tableProps = { ...rowActions, sort, onSortChange: setSort };

  return (
    <PageShell>
      <PageHeader
        title="Consultations"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectionMode((previous) => !previous);
                setSelectedIds(new Set());
              }}
            >
              {selectionMode ? "Terminer la sélection" : "Sélectionner"}
            </Button>
            <TemplatesManagerDialog />
            <NewConsultationDialog />
          </>
        }
      />

      <div className="relative">
        <MagnifyingGlassIcon
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Rechercher une consultation"
          placeholder="Rechercher par patient, mot-clé, problématique, date…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
        />
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm text-foreground">
            {selectedIds.size} consultation{selectedIds.size > 1 ? "s" : ""} sélectionnée
            {selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteRequest({ kind: "bulk", ids: Array.from(selectedIds) })}
            >
              Supprimer
            </Button>
          </div>
        </div>
      )}

      <FieldError>{error}</FieldError>

      {consultations === null && !error && (
        // Même silhouette que l'écran chargé (onglets + tableau encadré).
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-44" />
          <div className="flex flex-col rounded-lg border border-border bg-card px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="border-b border-border py-2.5 last:border-0">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {isEmpty && search && (
        <p className="text-sm text-muted-foreground">
          Aucune consultation ne correspond à cette recherche.
        </p>
      )}

      {isEmpty && !search && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardTextIcon />
            </EmptyMedia>
            <EmptyTitle>Aucune consultation pour le moment</EmptyTitle>
            <EmptyDescription>
              Démarrez votre première consultation pour commencer à documenter le suivi.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewConsultationDialog />
          </EmptyContent>
        </Empty>
      )}

      {consultations && !isEmpty && (
        <Tabs value={view} onValueChange={setView} className="gap-4">
          <TabsList>
            <TabsTrigger value="basic">Toutes</TabsTrigger>
            <TabsTrigger value="byPatient">Par patient</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ConsultationsTable
              consultations={consultations}
              // Vue globale : on montre le patient ; si la liste est déjà
              // filtrée sur un patient, c'est redondant.
              showPatient={!patientId}
              {...tableProps}
            />
          </TabsContent>

          <TabsContent value="byPatient">
            <div className="flex flex-col gap-6">
              {groupByPatient(consultations).map((group) => (
                <div key={group.patientId} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPatientId(group.patientId)}
                    className="self-start text-left text-sm font-semibold text-foreground hover:underline"
                  >
                    {group.patientName}
                  </button>
                  <ConsultationsTable
                    consultations={group.items}
                    showPatient={false}
                    {...tableProps}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <PatientDetailDrawer
        patientId={openPatientId}
        onClose={() => setOpenPatientId(null)}
        onUpdated={() => {}}
        onDeleted={(deletedPatientId) =>
          setConsultations(
            (previous) =>
              previous?.filter((consultation) => consultation.patientId !== deletedPatientId) ??
              previous
          )
        }
      />

      <Dialog
        open={deleteRequest !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteRequest?.kind === "bulk"
                ? `Supprimer ${deleteRequest.ids.length} consultations ?`
                : "Supprimer cette consultation ?"}
            </DialogTitle>
            <DialogDescription>
              {deleteRequest?.kind === "bulk"
                ? "Elles ne seront plus visibles dans vos listes."
                : "Elle ne sera plus visible dans vos listes."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRequest(null)}>
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
    </PageShell>
  );
}
