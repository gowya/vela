"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { PaperclipIcon } from "@phosphor-icons/react";
import type { ConsultationContent } from "@/types";
import { Button } from "@/components/ui/button";
import { FontSize } from "./FontSize";
import { Attachment, type AttachmentAttrs } from "./Attachment";
import { SlashCommand } from "./SlashCommand";
import { SelectionToolbar } from "./SelectionToolbar";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/attachment-constraints";

export const EMPTY_CONSULTATION_CONTENT: ConsultationContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export interface TiptapEditorHandle {
  setContent: (content: ConsultationContent) => void;
}

interface TiptapEditorProps {
  content: ConsultationContent;
  onChange: (content: ConsultationContent) => void;
  ensureConsultationId: () => Promise<string>;
  consultationId: string | null;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor({ content, onChange, ensureConsultationId, consultationId }, ref) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const consultationIdRef = useRef<string | null>(consultationId);
    consultationIdRef.current = consultationId;
    const [uploadError, setUploadError] = useState<string | null>(null);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          orderedList: false,
          strike: false,
          heading: { levels: [1, 2, 3] },
        }),
        TextStyle,
        Color,
        FontSize,
        TaskList,
        TaskItem.configure({ nested: false }),
        Placeholder.configure({ placeholder: "Écrivez… ('/' pour les options)" }),
        Attachment.configure({ getConsultationId: () => consultationIdRef.current }),
        SlashCommand.configure({
          onAttachmentRequest: () => fileInputRef.current?.click(),
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getJSON());
      },
      editorProps: {
        attributes: {
          class: "prose-consultation min-h-40 text-sm/relaxed text-foreground outline-none",
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;

          event.preventDefault();
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (coords) {
            const tr = view.state.tr.setSelection(
              TextSelection.create(view.state.doc, coords.pos)
            );
            view.dispatch(tr);
          }
          Array.from(files).forEach((file) => uploadAndInsertFile(file));
          return true;
        },
      },
    });

    useImperativeHandle(ref, () => ({
      setContent: (nextContent) => {
        editor?.commands.setContent(nextContent);
      },
    }));

    async function uploadAndInsertFile(file: File) {
      setUploadError(null);

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setUploadError("Fichier trop volumineux (20 Mo maximum).");
        return;
      }
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
        setUploadError("Type de fichier non autorisé.");
        return;
      }

      const id = await ensureConsultationId();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/consultations/${id}/attachments`, {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (!response || !response.ok) {
        setUploadError("L'envoi de la pièce jointe a échoué.");
        return;
      }

      const data = await response.json();
      const attrs: AttachmentAttrs = {
        attachmentId: data.attachment.id,
        url: `/api/attachments/${data.attachment.id}`,
        fileName: data.attachment.fileName,
        mimeType: data.attachment.mimeType,
        sizeBytes: data.attachment.sizeBytes,
      };
      editor?.chain().focus().insertAttachment(attrs).run();
    }

    function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
      const files = event.target.files;
      if (files) {
        Array.from(files).forEach((file) => uploadAndInsertFile(file));
      }
      event.target.value = "";
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1 text-muted-foreground"
          >
            <PaperclipIcon size={12} />
            Joindre un fichier
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFileInputChange}
            accept={Array.from(ALLOWED_ATTACHMENT_MIME_TYPES).join(",")}
          />
        </div>

        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

        {editor && <SelectionToolbar editor={editor} />}
        <EditorContent editor={editor} className="rounded-md" />
      </div>
    );
  }
);
