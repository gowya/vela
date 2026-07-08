"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowsClockwiseIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  SquaresFourIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { Consultation, ConsultationContent, ConsultationTemplate, Patient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EMPTY_CONSULTATION_CONTENT,
  TiptapEditor,
  type TiptapEditorHandle,
} from "./editor/TiptapEditor";

type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

interface ConsultationEditorProps {
  // null = brouillon pas encore créé en base (première sauvegarde = création).
  consultationId: string | null;
  patientId: string;
  templateId: string | null;
}

const AUTOSAVE_DELAY_MS = 800;

export function ConsultationEditor({
  consultationId,
  patientId,
  templateId,
}: ConsultationEditorProps) {
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ConsultationContent>(EMPTY_CONSULTATION_CONTENT);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateId);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<ConsultationTemplate[] | null>(
    null
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [saveAsTemplateName, setSaveAsTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveAsTemplateError, setSaveAsTemplateError] = useState<string | null>(null);

  const currentIdRef = useRef<string | null>(consultationId);
  const updatedAtRef = useRef<string | null>(null);
  const didLoadRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const hasConflictRef = useRef(false);
  const editorRef = useRef<TiptapEditorHandle>(null);

  // Une consultation déjà créée en base ne peut plus changer de point de départ :
  // "Partir d'un template" ne s'affiche que tant que le brouillon n'a jamais été
  // sauvegardé (page vierge, jamais de consultationId).
  const isBlankDraft = consultationId === null;

  // Chargement initial : patient (pour l'en-tête), la consultation existante si on
  // n'est pas en mode brouillon, la liste des templates si le brouillon est vierge,
  // et le nom du template déjà associé (badge) si la consultation en a un.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const requests: Promise<void>[] = [
        fetch(`/api/patients/${patientId}`)
          .then((response) => response.json())
          .then((data) => {
            if (!cancelled) setPatient(data.patient ?? null);
          }),
      ];

      if (consultationId) {
        requests.push(
          fetch(`/api/consultations/${consultationId}`)
            .then((response) => response.json())
            .then((data) => {
              if (cancelled || !data.consultation) return;
              const consultation: Consultation = data.consultation;
              updatedAtRef.current = new Date(consultation.updatedAt).toISOString();
              setTitle(consultation.title ?? "");
              setContent(consultation.content);
              if (consultation.templateId) {
                setSelectedTemplateId(consultation.templateId);
              }
            })
        );
      } else {
        requests.push(
          fetch("/api/consultation-templates")
            .then((response) => response.json())
            .then((data) => {
              if (!cancelled) setAvailableTemplates(data.templates ?? []);
            })
        );
      }

      if (templateId) {
        requests.push(
          fetch(`/api/consultation-templates/${templateId}`)
            .then((response) => response.json())
            .then((data) => {
              if (!cancelled) setTemplateName(data.template?.name ?? null);
            })
        );
      }

      await Promise.all(requests);
      if (!cancelled) {
        setIsLoading(false);
        // Laisse le prochain tick passer pour ne pas déclencher l'autosave
        // sur les valeurs qu'on vient de charger.
        setTimeout(() => {
          didLoadRef.current = true;
        }, 0);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, patientId, templateId]);

  const save = useCallback(
    async (options: { keepalive?: boolean } = {}) => {
      // Un conflit ne peut se résoudre qu'en rechargeant la page (updatedAt local
      // devenu obsolète) : on arrête les tentatives plutôt que de renvoyer le même
      // PATCH en boucle, ce qui redonnerait 409 indéfiniment.
      if (hasConflictRef.current) return;

      // Empêche deux requêtes de sauvegarde concurrentes : si une sauvegarde est déjà
      // en vol, on note qu'il faudra rejouer une sauvegarde à la fin de celle-ci plutôt
      // que d'envoyer un second PATCH avec le même updatedAt (faux conflit garanti).
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }
      isSavingRef.current = true;

      try {
        setStatus("saving");

        if (!currentIdRef.current) {
          const response = await fetch("/api/consultations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId,
              templateId: selectedTemplateId,
              title: title || null,
              content,
            }),
            keepalive: options.keepalive,
          }).catch(() => null);

          if (!response || !response.ok) {
            setStatus("error");
            return;
          }

          const data = await response.json();
          currentIdRef.current = data.consultation.id;
          updatedAtRef.current = new Date(data.consultation.updatedAt).toISOString();
          setStatus("saved");
          router.replace(`/consultations/${data.consultation.id}`);
          return;
        }

        const response = await fetch(`/api/consultations/${currentIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updatedAt: updatedAtRef.current,
            title: title || null,
            content,
          }),
          keepalive: options.keepalive,
        }).catch(() => null);

        if (!response) {
          setStatus("error");
          return;
        }

        if (response.status === 409) {
          hasConflictRef.current = true;
          setStatus("conflict");
          return;
        }

        if (!response.ok) {
          setStatus("error");
          return;
        }

        const data = await response.json();
        updatedAtRef.current = new Date(data.consultation.updatedAt).toISOString();
        setStatus("saved");
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          save(options);
        }
      }
    },
    [content, patientId, router, title, selectedTemplateId]
  );

  // Autosave débouncé à chaque changement de contenu.
  useEffect(() => {
    if (!didLoadRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  // Flush immédiat si l'onglet est masqué/fermé pendant que l'autosave est en attente
  // (fermeture d'ordinateur en fin de séance = le cas qui ne doit jamais perdre de note).
  useEffect(() => {
    function flush() {
      if (!didLoadRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      save({ keepalive: true });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [save]);

  async function handleDelete() {
    if (!currentIdRef.current) {
      router.push("/consultations");
      return;
    }
    if (!confirm("Supprimer cette consultation ? Elle ne sera plus visible dans vos listes.")) {
      return;
    }
    const response = await fetch(`/api/consultations/${currentIdRef.current}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("La suppression a échoué.");
      return;
    }
    router.push("/consultations");
  }

  function handleStartFromTemplate(id: string) {
    const found = availableTemplates?.find((t) => t.id === id);
    if (!found) return;

    setSelectedTemplateId(found.id);
    setTemplateName(found.name);
    setTitle(found.title ?? "");
    setContent(found.content);
    editorRef.current?.setContent(found.content);
  }

  // Une pièce jointe a une clé étrangère vers consultations.id : impossible de
  // l'uploader tant que le brouillon n'a jamais été sauvegardé. On force alors
  // une sauvegarde immédiate avant tout upload.
  async function ensureConsultationId(): Promise<string> {
    if (currentIdRef.current) return currentIdRef.current;
    await save();
    if (!currentIdRef.current) {
      throw new Error("La consultation n'a pas pu être créée.");
    }
    return currentIdRef.current;
  }

  async function handleSaveAsTemplate() {
    setSaveAsTemplateError(null);

    if (!saveAsTemplateName.trim()) {
      setSaveAsTemplateError("Le nom du template est requis.");
      return;
    }

    setIsSavingTemplate(true);
    const response = await fetch("/api/consultation-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveAsTemplateName.trim(),
        title: title || null,
        content,
      }),
    });
    setIsSavingTemplate(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setSaveAsTemplateError(data?.error ?? "La création du template a échoué.");
      return;
    }

    setSaveAsTemplateOpen(false);
    setSaveAsTemplateName("");
  }

  const statusConfig: Record<
    SaveStatus,
    { label: string; icon: typeof CheckCircleIcon; className: string } | null
  > = {
    idle: null,
    saving: {
      label: "Enregistrement…",
      icon: ArrowsClockwiseIcon,
      className: "bg-muted text-muted-foreground",
    },
    saved: {
      label: "Enregistré",
      icon: CheckCircleIcon,
      className: "bg-primary/10 text-primary",
    },
    conflict: {
      label: "Modifiée ailleurs — rechargez la page avant de continuer",
      icon: WarningCircleIcon,
      className: "bg-destructive/10 text-destructive",
    },
    error: {
      label: "Échec de l'enregistrement",
      icon: WarningCircleIcon,
      className: "bg-destructive/10 text-destructive",
    },
  };
  const statusInfo = statusConfig[status];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <Link
          href="/consultations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <CaretLeftIcon size={14} />
          Consultations
        </Link>
        <div className="flex items-center gap-3">
          {statusInfo && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                statusInfo.className
              )}
            >
              <statusInfo.icon
                size={12}
                className={status === "saving" ? "animate-spin" : undefined}
              />
              {statusInfo.label}
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
            Supprimer
          </Button>
        </div>
      </div>

      {patient && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {patient.firstName} {patient.lastName}
          </span>
          {templateName && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {templateName}
            </span>
          )}
        </div>
      )}

      <Input
        placeholder="Titre de la consultation (optionnel)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="border-none bg-transparent text-lg font-medium shadow-none focus-visible:ring-0"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {isBlankDraft && availableTemplates && availableTemplates.length > 0 && (
              <Select
                items={Object.fromEntries(
                  availableTemplates.map((t) => [t.id, t.name])
                )}
                value={selectedTemplateId ?? ""}
                onValueChange={(value) => value && handleStartFromTemplate(value)}
              >
                <SelectTrigger size="sm" className="w-auto gap-1.5">
                  <SquaresFourIcon size={12} />
                  <SelectValue placeholder="Partir d'un template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSaveAsTemplateName(title || "");
                setSaveAsTemplateOpen(true);
              }}
            >
              Enregistrer comme template
            </Button>
          </div>

          <TiptapEditor
            ref={editorRef}
            content={content}
            onChange={setContent}
            ensureConsultationId={ensureConsultationId}
            consultationId={currentIdRef.current}
          />
        </div>
      )}

      <Dialog open={saveAsTemplateOpen} onOpenChange={setSaveAsTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer comme template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Nom du template"
              value={saveAsTemplateName}
              onChange={(event) => setSaveAsTemplateName(event.target.value)}
              autoFocus
            />
            {saveAsTemplateError && (
              <p className="text-sm text-destructive">{saveAsTemplateError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveAsTemplate} disabled={isSavingTemplate}>
              {isSavingTemplate ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
