import { describe, expect, it } from "vitest";
import {
  consultationContentSchema,
  customFieldDefinitionCreateSchema,
  patientCreateSchema,
} from "./validation";

describe("patientCreateSchema", () => {
  const base = { firstName: "Jean", lastName: "Dupont" };

  it("accepte le minimum requis", () => {
    const result = patientCreateSchema.safeParse(base);

    expect(result.success).toBe(true);
  });

  it("rejette un prénom vide", () => {
    const result = patientCreateSchema.safeParse({ ...base, firstName: "  " });

    expect(result.success).toBe(false);
  });

  it("normalise une chaîne vide en null pour les champs optionnels", () => {
    const result = patientCreateSchema.safeParse({ ...base, phone: "", intakeNotes: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
      expect(result.data.intakeNotes).toBeNull();
    }
  });

  it("rejette un email invalide", () => {
    const result = patientCreateSchema.safeParse({ ...base, email: "pas-un-email" });

    expect(result.success).toBe(false);
  });

  it("rejette une date de naissance mal formée", () => {
    const result = patientCreateSchema.safeParse({ ...base, birthDate: "01/05/1990" });

    expect(result.success).toBe(false);
  });

  it("accepte une date de naissance au format ISO court", () => {
    const result = patientCreateSchema.safeParse({ ...base, birthDate: "1990-05-01" });

    expect(result.success).toBe(true);
  });
});

describe("customFieldDefinitionCreateSchema", () => {
  it("exige au moins deux options pour un champ à choix", () => {
    const result = customFieldDefinitionCreateSchema.safeParse({
      fieldName: "Allergies",
      fieldType: "choice",
      options: ["Pollen"],
    });

    expect(result.success).toBe(false);
  });

  it("accepte un champ à choix avec au moins deux options", () => {
    const result = customFieldDefinitionCreateSchema.safeParse({
      fieldName: "Allergies",
      fieldType: "choice",
      options: ["Pollen", "Arachides"],
    });

    expect(result.success).toBe(true);
  });

  it("vide les options d'un champ qui n'est pas à choix", () => {
    const result = customFieldDefinitionCreateSchema.safeParse({
      fieldName: "Notes",
      fieldType: "text",
      options: ["ignoré"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toEqual([]);
    }
  });
});

describe("consultationContentSchema", () => {
  it("accepte un document Tiptap valide", () => {
    const result = consultationContentSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Bonjour" }] }],
    });

    expect(result.success).toBe(true);
  });

  it("rejette un contenu dépassant la taille maximale autorisée", () => {
    const hugeText = "a".repeat(500_001);
    const result = consultationContentSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: hugeText }] }],
    });

    expect(result.success).toBe(false);
  });
});
