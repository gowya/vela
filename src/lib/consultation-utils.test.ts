import { describe, expect, it } from "vitest";
import { deriveContentText, normalizeConsultationContent } from "./consultation-utils";

describe("normalizeConsultationContent", () => {
  it("laisse passer un document Tiptap déjà au bon format", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [] }] };

    expect(normalizeConsultationContent(doc)).toEqual(doc);
  });

  it("migre l'ancien format en blocs vers un document Tiptap", () => {
    const legacy = {
      blocks: [
        { id: "1", type: "paragraph", text: "Bonjour" },
        { id: "2", type: "heading", text: "Titre" },
      ],
    };

    const result = normalizeConsultationContent(legacy);

    expect(result.type).toBe("doc");
    expect(result.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "Bonjour" }] },
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titre" }] },
    ]);
  });

  it("fusionne les puces consécutives en une seule liste", () => {
    const legacy = {
      blocks: [
        { id: "1", type: "bullet", text: "Premier" },
        { id: "2", type: "bullet", text: "Second" },
      ],
    };

    const result = normalizeConsultationContent(legacy);

    expect(result.content).toHaveLength(1);
    expect(result.content?.[0].type).toBe("bulletList");
    expect(result.content?.[0].content).toHaveLength(2);
  });

  it("produit un paragraphe vide pour une liste de blocs vide", () => {
    const result = normalizeConsultationContent({ blocks: [] });

    expect(result).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("deriveContentText", () => {
  it("concatène le texte de chaque bloc sur une ligne distincte", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Première ligne" }] },
        { type: "paragraph", content: [{ type: "text", text: "Seconde ligne" }] },
      ],
    };

    expect(deriveContentText(doc)).toBe("Première ligne\nSeconde ligne");
  });

  it("ignore les blocs vides", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [{ type: "text", text: "Contenu" }] },
      ],
    };

    expect(deriveContentText(doc)).toBe("Contenu");
  });

  it("indexe les pièces jointes par leur nom de fichier", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "attachment",
          attrs: { fileName: "bilan.pdf" },
        },
      ],
    };

    expect(deriveContentText(doc)).toBe("Pièce jointe : bilan.pdf");
  });
});
