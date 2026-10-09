"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CaretRightIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import type { Consultation, ConsultationContent, ConsultationVersion, ConsultationVersionDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import { TiptapEditor } from "./editor/TiptapEditor";

// Sentinel distinguant "l'état courant de l'éditeur" (jamais fetché, jamais
// restaurable) des vraies lignes de consultation_versions.
const CURRENT_VERSION_ID = "current";

function formatVersionDate(value: Date | string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function VersionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full truncate rounded-md px-2 py-1.5 text-left text-xs/relaxed transition-colors",
        selected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

interface ConsultationVersionHistoryProps {
  consultationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContent: ConsultationContent;
  // Incrémenté depuis ConsultationEditor (ex. après le raccourci ⌘/Ctrl+Alt+S)
  // pour forcer un rafraîchissement de la liste même si le panneau reste ouvert.
  refreshToken: number;
  onRestored: (consultation: Consultation) => void;
}

export function ConsultationVersionHistory({
  consultationId,
  open,
  onOpenChange,
  currentContent,
  refreshToken,
  onRestored,
}: ConsultationVersionHistoryProps) {
  const [versions, setVersions] = useState<ConsultationVersion[] | null>(null);
  const [versionsFailed, setVersionsFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(CURRENT_VERSION_ID);
  const [selectedDetail, setSelectedDetail] = useState<ConsultationVersionDetail | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const selectRequestRef = useRef(0);

  // Ouverture (ou changement de consultation/refreshToken pendant que le panneau
  // est ouvert) : repart d'un état vierge avant de recharger la liste des
  // versions. Ajustement pendant le rendu (et non un effect) puisqu'il ne fait
  // que dériver de ces props.
  const resetKey = `${open}:${consultationId}:${refreshToken}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (open && resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setVersions(null);
    setVersionsFailed(false);
    setSelectedId(CURRENT_VERSION_ID);
    setSelectedDetail(null);
    setAutoExpanded(false);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetchJson<{ versions: ConsultationVersion[] }>(
      `/api/consultations/${consultationId}/versions`
    ).then((data) => {
      if (cancelled) return;
      if (!data) {
        setVersionsFailed(true);
        return;
      }
      setVersions(data.versions ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [open, consultationId, refreshToken]);

  function handleSelect(versionId: string) {
    setSelectedId(versionId);
    setSelectedDetail(null);
    if (versionId === CURRENT_VERSION_ID) return;

    const requestId = ++selectRequestRef.current;
    fetchJson<{ version: ConsultationVersionDetail }>(
      `/api/consultations/${consultationId}/versions/${versionId}`
    ).then((data) => {
      if (selectRequestRef.current !== requestId) return;
      if (!data?.version) {
        // Sinon l'aperçu resterait en chargement indéfiniment.
        setSelectedId(CURRENT_VERSION_ID);
        toast.error("Impossible d'afficher cette version.");
        return;
      }
      setSelectedDetail(data.version);
    });
  }

  async function handleCreateVersion() {
    setIsCreating(true);
    const response = await fetch(`/api/consultations/${consultationId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: createLabel.trim() || undefined }),
    }).catch(() => null);
    setIsCreating(false);

    if (!response || !response.ok) {
      toast.error("L'enregistrement de la version a échoué.");
      return;
    }

    const data = await response.json();
    setVersions((previous) => (previous ? [data.version, ...previous] : [data.version]));
    setCreateOpen(false);
    setCreateLabel("");
    toast.success("Version enregistrée.");
  }

  async function confirmRestore() {
    if (selectedId === CURRENT_VERSION_ID) return;

    setIsRestoring(true);
    const response = await fetch(
      `/api/consultations/${consultationId}/versions/${selectedId}/restore`,
      { method: "POST" }
    ).catch(() => null);
    setIsRestoring(false);
    setRestoreOpen(false);

    if (!response || !response.ok) {
      toast.error("La restauration a échoué.");
      return;
    }

    const data = await response.json();
    onRestored(data.consultation);
  }

  const manualVersions = versions?.filter((version) => version.isManual) ?? [];
  const autoVersions = versions?.filter((version) => !version.isManual) ?? [];
  const canRestore = selectedId !== CURRENT_VERSION_ID && selectedDetail !== null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0 sm:max-w-3xl">
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>Historique des versions</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setCreateOpen(true)}
              className="mr-6"
            >
              <PlusIcon />
              <span className="sr-only">Enregistrer une version</span>
            </Button>
          </SheetHeader>

          <div className="flex min-h-0 flex-1">
            <div className="flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-2">
              <VersionRow
                label="Version actuelle"
                selected={selectedId === CURRENT_VERSION_ID}
                onClick={() => handleSelect(CURRENT_VERSION_ID)}
              />

              {manualVersions.map((version) => (
                <VersionRow
                  key={version.id}
                  label={version.label ?? formatVersionDate(version.createdAt)}
                  selected={selectedId === version.id}
                  onClick={() => handleSelect(version.id)}
                />
              ))}

              {autoVersions.length > 0 && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setAutoExpanded((value) => !value)}
                    className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs/relaxed text-muted-foreground hover:bg-muted"
                  >
                    {autoExpanded ? (
                      <CaretDownIcon size={12} />
                    ) : (
                      <CaretRightIcon size={12} />
                    )}
                    {autoVersions.length} version{autoVersions.length > 1 ? "s" : ""} automatique
                    {autoVersions.length > 1 ? "s" : ""}
                  </button>
                  {autoExpanded &&
                    autoVersions.map((version) => (
                      <VersionRow
                        key={version.id}
                        label={formatVersionDate(version.createdAt)}
                        selected={selectedId === version.id}
                        onClick={() => handleSelect(version.id)}
                      />
                    ))}
                </div>
              )}

              {versionsFailed && (
                <p className="px-2 py-1.5 text-xs/relaxed text-destructive">
                  Impossible de charger l&apos;historique. Fermez puis rouvrez le panneau pour
                  réessayer.
                </p>
              )}

              {versions === null && !versionsFailed && (
                <div className="flex flex-col gap-1 p-1">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}

              {versions !== null && versions.length === 0 && (
                <p className="px-2 py-1.5 text-xs/relaxed text-muted-foreground">
                  Aucune version enregistrée pour l&apos;instant.
                </p>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              {selectedId !== CURRENT_VERSION_ID && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setRestoreOpen(true)}
                    disabled={!canRestore}
                    className="gap-1"
                  >
                    <ArrowCounterClockwiseIcon size={14} />
                    Restaurer cette version
                  </Button>
                </div>
              )}

              {selectedId === CURRENT_VERSION_ID ? (
                <TiptapEditor
                  key={CURRENT_VERSION_ID}
                  editable={false}
                  allowAttachments={false}
                  content={currentContent}
                  onChange={() => {}}
                  ensureConsultationId={async () => consultationId}
                  consultationId={consultationId}
                />
              ) : selectedDetail ? (
                <TiptapEditor
                  key={selectedDetail.id}
                  editable={false}
                  allowAttachments={false}
                  content={selectedDetail.content}
                  onChange={() => {}}
                  ensureConsultationId={async () => consultationId}
                  consultationId={consultationId}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une version</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Nom de la version (optionnel)"
              value={createLabel}
              onChange={(event) => setCreateLabel(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleCreateVersion} disabled={isCreating}>
              {isCreating ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer cette version ?</DialogTitle>
            <DialogDescription>
              Le contenu actuel sera remplacé. Il sera automatiquement conservé dans
              l&apos;historique.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRestoreOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={confirmRestore} disabled={isRestoring}>
              {isRestoring ? "Restauration…" : "Restaurer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
