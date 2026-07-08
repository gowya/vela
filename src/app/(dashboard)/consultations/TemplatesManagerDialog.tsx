"use client";

import { useEffect, useState } from "react";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { ConsultationTemplate } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TemplatesManagerDialog() {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ConsultationTemplate[] | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadTemplates();
  }, [open]);

  function loadTemplates() {
    fetch("/api/consultation-templates")
      .then((response) => response.json())
      .then((data) => setTemplates(data.templates ?? []));
  }

  function startRename(template: ConsultationTemplate) {
    setError(null);
    setRenamingId(template.id);
    setRenameValue(template.name);
  }

  async function confirmRename() {
    if (!renamingId) return;
    if (!renameValue.trim()) {
      setError("Le nom du template est requis.");
      return;
    }

    const response = await fetch(`/api/consultation-templates/${renamingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Le renommage a échoué.");
      return;
    }

    setRenamingId(null);
    loadTemplates();
  }

  async function handleDelete(templateId: string) {
    await fetch(`/api/consultation-templates/${templateId}`, { method: "DELETE" });
    loadTemplates();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Mes templates</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Templates de consultation</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {templates === null && (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}

          {templates?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun template pour le moment. Depuis une consultation, utilisez
              « Enregistrer comme template » pour en créer un.
            </p>
          )}

          {templates?.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              {renamingId === template.id ? (
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") confirmRename();
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                  className="h-6"
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{template.name}</p>
                  {template.title && (
                    <p className="truncate text-xs text-muted-foreground">{template.title}</p>
                  )}
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {renamingId === template.id ? (
                  <Button type="button" variant="ghost" size="sm" onClick={confirmRename}>
                    Valider
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Renommer"
                    onClick={() => startRename(template)}
                  >
                    <PencilSimpleIcon size={14} />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer"
                  onClick={() => handleDelete(template.id)}
                >
                  <TrashIcon size={14} />
                </Button>
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
