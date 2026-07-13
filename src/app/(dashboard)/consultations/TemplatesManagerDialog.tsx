"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotsThreeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { ConsultationTemplate, Patient } from "@/types";
import { deriveContentText } from "@/lib/consultation-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function TemplatesManagerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ConsultationTemplate[] | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ConsultationTemplate | null>(null);

  // Modèle pour lequel on est en train de choisir un patient afin de démarrer une
  // consultation (une consultation exige un patient). Un seul picker partagé.
  const [usingTemplate, setUsingTemplate] = useState<ConsultationTemplate | null>(null);
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadTemplates();
  }, [open]);

  useEffect(() => {
    if (!usingTemplate) return;
    setSelectedPatientId("");
    setPickError(null);
    fetch("/api/patients")
      .then((response) => response.json())
      .then((data) => setPatients(data.patients ?? []));
  }, [usingTemplate]);

  function loadTemplates() {
    fetch("/api/consultation-templates")
      .then((response) => response.json())
      .then((data) => setTemplates(data.templates ?? []));
  }

  function openTemplateEditor(templateId: string) {
    setOpen(false);
    router.push(`/consultations/models/${templateId}`);
  }

  function startConsultationFromTemplate() {
    if (!usingTemplate) return;
    if (!selectedPatientId) {
      setPickError("Choisissez un patient.");
      return;
    }
    const templateId = usingTemplate.id;
    setUsingTemplate(null);
    setOpen(false);
    router.push(`/consultations/new?patientId=${selectedPatientId}&templateId=${templateId}`);
  }

  async function confirmDelete() {
    if (!deletingTemplate) return;
    await fetch(`/api/consultation-templates/${deletingTemplate.id}`, { method: "DELETE" });
    setDeletingTemplate(null);
    loadTemplates();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" />}>Mes modèles</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modèles de consultation</DialogTitle>
          </DialogHeader>

          <div className="flex min-w-0 flex-col gap-2">
            {templates === null && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}

            {templates?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun modèle pour le moment. Créez-en un ci-dessous, ou depuis une
                consultation via « Enregistrer comme modèle ».
              </p>
            )}

            {templates?.map((template) => {
              const preview = deriveContentText(template.content).replace(/\s+/g, " ").trim();
              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{template.name}</p>
                    {preview && (
                      <p className="truncate text-xs text-muted-foreground">{preview}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {/* Action reine : démarrer une consultation à partir de ce modèle
                        (choix du patient puis éditeur pré-rempli avec le modèle). */}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setUsingTemplate(template)}
                    >
                      Nouvelle consultation
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Plus d'actions"
                          />
                        }
                      >
                        <DotsThreeIcon size={18} weight="bold" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openTemplateEditor(template.id)}>
                          <PencilSimpleIcon size={14} />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingTemplate(template)}
                        >
                          <TrashIcon size={14} />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}

            {/* Un modèle n'est rattaché à aucun patient : on ouvre un éditeur de
                modèle dédié plutôt que le flux consultation (qui exige un patient). */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setOpen(false);
                router.push("/consultations/models/new");
              }}
            >
              Créer un modèle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Picker patient partagé : démarrer une consultation depuis le modèle choisi. */}
      <Dialog
        open={usingTemplate !== null}
        onOpenChange={(nextOpen) => !nextOpen && setUsingTemplate(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle consultation</DialogTitle>
            {usingTemplate && (
              <DialogDescription>À partir du modèle « {usingTemplate.name} »</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Combobox
              label="Patient"
              options={(patients ?? []).map((patient) => ({
                value: patient.id,
                label: `${patient.firstName} ${patient.lastName}`,
              }))}
              value={selectedPatientId || null}
              onValueChange={(value) => setSelectedPatientId(value ?? "")}
              placeholder="Choisir un patient"
            />

            {pickError && <p className="text-sm text-destructive">{pickError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" onClick={startConsultationFromTemplate}>
              Commencer la consultation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingTemplate !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeletingTemplate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce modèle ?</DialogTitle>
            <DialogDescription>Cette action est définitive.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingTemplate(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
