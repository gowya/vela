import { describe, expect, it } from "vitest";
import { mapConsultationListItemRow, mapPatientRow } from "./mappers";

describe("mapPatientRow", () => {
  it("convertit les colonnes snake_case en camelCase", () => {
    const row = {
      id: "p1",
      practitioner_id: "pr1",
      first_name: "Jean",
      last_name: "Dupont",
      email: null,
      phone: null,
      birth_date: "1990-05-01",
      intake_notes: null,
      gender_identity: null,
      identified_issue: null,
      address: null,
      status: null,
      last_appointment_at: null,
      next_appointment_at: null,
      created_at: new Date("2024-01-01T00:00:00Z"),
    };

    expect(mapPatientRow(row)).toMatchObject({
      id: "p1",
      practitionerId: "pr1",
      firstName: "Jean",
      lastName: "Dupont",
      birthDate: "1990-05-01",
    });
  });
});

describe("mapConsultationListItemRow", () => {
  const baseRow = {
    id: "c1",
    patient_id: "p1",
    patient_first_name: "Jean",
    patient_last_name: "Dupont",
    template_id: null,
    template_name: null,
    title: null,
    date: new Date("2024-01-01T00:00:00Z"),
    updated_at: new Date("2024-01-01T00:00:00Z"),
  };

  it("ne tronque pas un contenu court", () => {
    const result = mapConsultationListItemRow({ ...baseRow, content_text: "Une note courte" });

    expect(result.excerpt).toBe("Une note courte");
  });

  it("tronque un contenu long à 140 caractères avec une ellipse", () => {
    const longText = "a".repeat(200);

    const result = mapConsultationListItemRow({ ...baseRow, content_text: longText });

    expect(result.excerpt).toBe(`${"a".repeat(140)}…`);
  });

  it("retire les espaces de début/fin avant de calculer l'extrait", () => {
    const result = mapConsultationListItemRow({ ...baseRow, content_text: "  entouré d'espaces  " });

    expect(result.excerpt).toBe("entouré d'espaces");
  });
});
