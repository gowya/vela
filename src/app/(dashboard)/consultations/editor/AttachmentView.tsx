"use client";

import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { DownloadSimpleIcon, FileIcon, TrashIcon } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function AttachmentView({ node, deleteNode, extension, selected }: ReactNodeViewProps) {
  const { attachmentId, url, fileName, mimeType, sizeBytes } = node.attrs as {
    attachmentId: string;
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const consultationId = extension.options.getConsultationId?.() as string | null | undefined;
    if (!consultationId) {
      deleteNode();
      return;
    }

    setIsDeleting(true);
    setError(null);
    const response = await fetch(
      `/api/consultations/${consultationId}/attachments/${attachmentId}`,
      { method: "DELETE" }
    ).catch(() => null);

    if (!response || !response.ok) {
      setIsDeleting(false);
      setError("La suppression a échoué.");
      return;
    }

    deleteNode();
  }

  return (
    <NodeViewWrapper
      data-type="attachment"
      className={cn(
        "my-1 flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5",
        selected && "ring-2 ring-ring/50"
      )}
      contentEditable={false}
    >
      <FileIcon size={16} className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs font-medium text-foreground hover:underline"
        >
          {fileName}
        </a>
        <p className="text-[0.625rem] text-muted-foreground">
          {formatSize(sizeBytes)} · {mimeType}
        </p>
        {error && <p className="text-[0.625rem] text-destructive">{error}</p>}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Télécharger"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }))}
      >
        <DownloadSimpleIcon size={12} />
      </a>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Supprimer la pièce jointe"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <TrashIcon size={12} />
      </Button>
    </NodeViewWrapper>
  );
}
