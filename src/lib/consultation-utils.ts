import type { ConsultationContent } from "@/types";

// Forme héritée de l'éditeur en blocs à texte plat (avant l'éditeur riche
// Tiptap) : conservée uniquement pour typer l'entrée de la migration paresseuse
// ci-dessous, jamais exposée au reste de l'application.
type LegacyConsultationBlock = {
  id: string;
  type: "paragraph" | "heading" | "bullet" | "checklist";
  text: string;
  checked?: boolean;
};
type LegacyConsultationContent = { blocks: LegacyConsultationBlock[] };

function isLegacyContent(raw: unknown): raw is LegacyConsultationContent {
  return (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { blocks?: unknown }).blocks)
  );
}

function legacyBlockToNode(block: LegacyConsultationBlock): ConsultationContent {
  const textNode = block.text.length > 0 ? [{ type: "text", text: block.text }] : [];

  switch (block.type) {
    case "heading":
      return { type: "heading", attrs: { level: 1 }, content: textNode };
    case "bullet":
      return {
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: textNode }] }],
      };
    case "checklist":
      return {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: block.checked ?? false },
            content: [{ type: "paragraph", content: textNode }],
          },
        ],
      };
    case "paragraph":
    default:
      return { type: "paragraph", content: textNode };
  }
}

// Convertit l'ancien format (liste de blocs à texte plat, avant l'éditeur riche
// Tiptap) en document ProseMirror équivalent. Les listes/checklists consécutives
// sont fusionnées en un seul nœud `bulletList`/`taskList` (comme le rendait déjà
// l'ancien éditeur visuellement).
function migrateLegacyContent(legacy: LegacyConsultationContent): ConsultationContent {
  const nodes: ConsultationContent[] = [];

  for (const block of legacy.blocks) {
    const node = legacyBlockToNode(block);
    const previous = nodes[nodes.length - 1];

    if (previous && previous.type === node.type && (node.type === "bulletList" || node.type === "taskList")) {
      previous.content = [...(previous.content ?? []), ...(node.content ?? [])];
      continue;
    }

    nodes.push(node);
  }

  return {
    type: "doc",
    content: nodes.length > 0 ? nodes : [{ type: "paragraph" }],
  };
}

// Point de passage unique pour toute lecture de `content` (consultations et
// templates) : met à niveau paresseusement l'ancien format vers le document
// Tiptap, sans réécriture batch en base. Une fois rouvert puis sauvegardé
// (autosave), le contenu est réécrit au nouveau format.
export function normalizeConsultationContent(raw: unknown): ConsultationContent {
  if (isLegacyContent(raw)) {
    return migrateLegacyContent(raw);
  }
  return raw as ConsultationContent;
}

// `content_text` est toujours dérivé de `content` côté serveur (jamais envoyé par
// le client) : ça garantit que la recherche reste cohérente avec le contenu réel,
// quelle que soit la façon dont le document a été édité. On parcourt l'arbre
// Tiptap et on concatène le texte de chaque nœud feuille, en sautant une ligne
// aux frontières de bloc ; les pièces jointes sont indexées par leur nom de
// fichier pour rester trouvables à la recherche.
export function deriveContentText(content: ConsultationContent): string {
  const lines: string[] = [];
  let current = "";

  function visit(node: ConsultationContent | undefined) {
    if (!node) return;

    if (node.type === "text" && node.text) {
      current += node.text;
      return;
    }

    if (node.type === "attachment") {
      const fileName = (node.attrs as { fileName?: string } | undefined)?.fileName;
      if (fileName) {
        current += `Pièce jointe : ${fileName}`;
      }
    }

    const isBlock = node.type !== "text" && node.type !== "doc";

    node.content?.forEach((child) => visit(child));

    if (isBlock) {
      const trimmed = current.trim();
      if (trimmed.length > 0) lines.push(trimmed);
      current = "";
    }
  }

  visit(content);
  const trimmed = current.trim();
  if (trimmed.length > 0) lines.push(trimmed);

  return lines.join("\n");
}
