"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowsClockwiseIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  PencilSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { ConsultationContent } from "@/types";
import { deriveContentText } from "@/lib/consultation-utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  EMPTY_CONSULTATION_CONTENT,
  TiptapEditor,
  type TiptapEditorHandle,
} from "../editor/TiptapEditor";

type SaveStatus = "idle" | "unnamed" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

interface TemplateEditorProps {
  // null = nouveau modèle (le premier autosave le crée). Un id = édition.
  templateId?: string | null;
}

// Éditeur de modèle autonome (aucun patient rattaché). Même logique d'autosave
// que l'éditeur de consultation : le premier enregistrement crée le modèle (POST),
// les suivants le mettent à jour (PATCH). Aucun bouton d'enregistrement manuel.
export function TemplateEditor({ templateId = null }: TemplateEditorProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [content, setContent] = useState<ConsultationContent>(EMPTY_CONSULTATION_CONTENT);
  const [isLoading, setIsLoading] = useState(templateId !== null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const currentIdRef = useRef<string | null>(templateId);
  const didLoadRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  // Dernière charge utile envoyée (ou chargée) : permet de ne pas ré-enregistrer
  // un contenu identique — notamment l'update initial émis par l'éditeur au montage.
  const lastSavedRef = useRef<string | null>(null);
  const editorRef = useRef<TiptapEditorHandle>(null);

  function serializePayload(nextName: string, nextContent: ConsultationContent): string {
    return JSON.stringify({ name: nextName.trim(), content: nextContent });
  }

  // Chargement initial en mode édition : on récupère nom + contenu du modèle.
  useEffect(() => {
    let cancelled = false;

    // On active l'autosave au tick suivant pour ne pas le déclencher sur les
    // valeurs initiales (mode création) ou fraîchement chargées (mode édition).
    const enableAutosaveNextTick = () => {
      setTimeout(() => {
        if (!cancelled) didLoadRef.current = true;
      }, 0);
    };

    if (templateId === null) {
      enableAutosaveNextTick();
      return;
    }

    fetch(`/api/consultation-templates/${templateId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.template) {
          setStatus("error");
          setIsLoading(false);
          return;
        }
        setName(data.template.name);
        setContent(data.template.content);
        editorRef.current?.setContent(data.template.content);
        lastSavedRef.current = serializePayload(data.template.name, data.template.content);
        setIsLoading(false);
        enableAutosaveNextTick();
      });

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const save = useCallback(async () => {
    // Un modèle exige un nom : tant qu'il est vide, rien n'est enregistré (on ne
    // crée pas de modèle anonyme, et on ne peut pas vider le nom d'un modèle existant).
    if (!name.trim()) {
      // Nag utile seulement si du contenu a été écrit (risque de perte) ; sur un
      // écran encore vierge, on ne dérange pas.
      const hasContent = deriveContentText(content).trim().length > 0;
      setStatus(hasContent ? "unnamed" : "idle");
      return;
    }

    const payload = serializePayload(name, content);
    // Rien n'a changé depuis le dernier enregistrement (ex. update initial de
    // l'éditeur au montage) : on n'écrit pas et on n'affiche pas « Enregistré ».
    if (payload === lastSavedRef.current) return;

    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    isSavingRef.current = true;

    try {
      setStatus("saving");

      if (!currentIdRef.current) {
        const response = await fetch("/api/consultation-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }).catch(() => null);

        if (!response || !response.ok) {
          setStatus("error");
          return;
        }

        const data = await response.json();
        currentIdRef.current = data.template.id;
        lastSavedRef.current = payload;
        setStatus("saved");
        // L'URL passe sur le modèle créé pour que les enregistrements suivants
        // soient des PATCH et que la page reste éditable au rechargement.
        router.replace(`/consultations/models/${data.template.id}`);
        return;
      }

      const response = await fetch(`/api/consultation-templates/${currentIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => null);

      if (response && response.ok) {
        lastSavedRef.current = payload;
        setStatus("saved");
      } else {
        setStatus("error");
      }
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        save();
      }
    }
  }, [name, content, router]);

  // Autosave débouncé à chaque changement de nom ou de contenu.
  useEffect(() => {
    if (!didLoadRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(), AUTOSAVE_DELAY_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, content]);

  const statusConfig: Record<
    Exclude<SaveStatus, "idle">,
    { label: string; icon: typeof CheckCircleIcon; className: string }
  > = {
    unnamed: {
      label: "Nommez le modèle pour l'enregistrer",
      icon: PencilSimpleIcon,
      className: "bg-muted text-muted-foreground",
    },
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
    error: {
      label: "Échec de l'enregistrement",
      icon: WarningCircleIcon,
      className: "bg-destructive/10 text-destructive",
    },
  };
  const statusInfo = status === "idle" ? null : statusConfig[status];

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
      </div>

      <Input
        placeholder="Nom du modèle"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="border-none bg-transparent text-lg font-medium shadow-none focus-visible:ring-0"
        autoFocus
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <TiptapEditor
          ref={editorRef}
          content={content}
          onChange={setContent}
          consultationId={null}
          allowAttachments={false}
          // Jamais appelé : les pièces jointes sont désactivées dans un modèle.
          ensureConsultationId={() =>
            Promise.reject(new Error("Pièces jointes indisponibles dans un modèle."))
          }
        />
      )}
    </main>
  );
}
