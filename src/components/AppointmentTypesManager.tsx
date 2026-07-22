"use client";

import { useEffect, useState } from "react";
import { DotsThreeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { AppointmentType } from "@/types";
import { formatDuration } from "@/lib/duration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface FormState {
  name: string;
  durationMinutes: string;
}

const EMPTY_FORM: FormState = { name: "", durationMinutes: "" };

export function AppointmentTypesManager() {
  const [types, setTypes] = useState<AppointmentType[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Présent = édition d'un type existant, absent = création.
  const [editingType, setEditingType] = useState<AppointmentType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletingType, setDeletingType] = useState<AppointmentType | null>(null);

  useEffect(() => {
    loadTypes();
  }, []);

  function loadTypes() {
    fetch("/api/appointment-types")
      .then((response) => response.json())
      .then((data) => setTypes(data.appointmentTypes ?? []))
      .catch(() => setError("Impossible de charger les types de rendez-vous."));
  }

  function openCreateForm() {
    setEditingType(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(type: AppointmentType) {
    setEditingType(type);
    setForm({ name: type.name, durationMinutes: String(type.durationMinutes) });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    const durationMinutes = Number(form.durationMinutes);
    if (!form.name.trim()) {
      setFormError("Le nom est requis.");
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
      setFormError("La durée doit être comprise entre 5 et 480 minutes.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const response = editingType
      ? await fetch(`/api/appointment-types/${editingType.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), durationMinutes }),
        })
      : await fetch("/api/appointment-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), durationMinutes }),
        });

    const data = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(data?.error ?? "Impossible d'enregistrer ce type de rendez-vous.");
      return;
    }

    setFormOpen(false);
    loadTypes();
  }

  async function confirmDelete() {
    if (!deletingType) return;
    await fetch(`/api/appointment-types/${deletingType.id}`, { method: "DELETE" });
    setDeletingType(null);
    loadTypes();
  }

  return (
    <div className="flex flex-col gap-2">
      {types === null && !error && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {types?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun type de rendez-vous pour le moment. Créez-en un pour accélérer la prise de
          rendez-vous.
        </p>
      )}

      {types?.map((type) => (
        <div
          key={type.id}
          className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            {type.name}
          </span>
          <span className="shrink-0 text-muted-foreground">{formatDuration(type.durationMinutes)}</span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Plus d'actions" />
              }
            >
              <DotsThreeIcon size={18} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditForm(type)}>
                <PencilSimpleIcon size={14} />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingType(type)}>
                <TrashIcon size={14} />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      <Button type="button" variant="outline" className="mt-1 w-full" onClick={openCreateForm}>
        Ajouter un type de rendez-vous
      </Button>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Modifier le type de rendez-vous" : "Nouveau type de rendez-vous"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="appointment-type-name" className="mb-1">
                Nom
              </Label>
              <Input
                id="appointment-type-name"
                value={form.name}
                placeholder="ex. Séance individuelle"
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="appointment-type-duration" className="mb-1">
                Durée (minutes)
              </Label>
              <Input
                id="appointment-type-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.durationMinutes}
                placeholder="ex. 45"
                onChange={(event) =>
                  setForm((f) => ({ ...f, durationMinutes: event.target.value }))
                }
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingType !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeletingType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce type de rendez-vous ?</DialogTitle>
            <DialogDescription>
              Les rendez-vous déjà planifiés avec « {deletingType?.name} » garderont leur durée,
              mais ne seront plus rattachés à ce type.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingType(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
