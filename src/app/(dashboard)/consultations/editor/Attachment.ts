import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AttachmentView } from "./AttachmentView";

export interface AttachmentAttrs {
  attachmentId: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      insertAttachment: (attrs: AttachmentAttrs) => ReturnType;
    };
  }
}

// Node atome (non éditable, non fusionnable) représentant une pièce jointe déjà
// uploadée. Le fichier réel vit derrière la route API authentifiée /api/attachments/[id]
// (voir src/lib/attachment-storage.ts) — ce node ne stocke qu'une référence.
export const Attachment = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      // La consultation peut ne pas encore exister en base au moment où l'extension
      // est configurée (brouillon jamais sauvegardé) : on passe un getter plutôt
      // qu'une valeur figée pour toujours lire l'id courant au moment du DELETE.
      getConsultationId: (): string | null => null,
    };
  },

  addAttributes() {
    return {
      attachmentId: { default: null },
      url: { default: null },
      fileName: { default: null },
      mimeType: { default: null },
      sizeBytes: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="attachment"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "attachment" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView);
  },

  addCommands() {
    return {
      insertAttachment:
        (attrs: AttachmentAttrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
