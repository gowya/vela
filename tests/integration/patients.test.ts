import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/patients/route";
import pool from "@/lib/db";
import { asGuest, asPractitioner } from "./helpers/auth";
import { createPatient, createPractitioner } from "./helpers/fixtures";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/patients", () => {
  it("refuse une requête non authentifiée", async () => {
    asGuest();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("ne renvoie jamais les patients d'un autre praticien", async () => {
    const practitionerA = await createPractitioner();
    const practitionerB = await createPractitioner();
    await createPatient(practitionerA.id, { firstName: "Alice" });
    await createPatient(practitionerB.id, { firstName: "Bob" });

    asPractitioner(practitionerA.id);
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.patients).toHaveLength(1);
    expect(body.patients[0].firstName).toBe("Alice");
  });
});

describe("POST /api/patients", () => {
  it("refuse une requête non authentifiée", async () => {
    asGuest();

    const response = await POST(postRequest({ firstName: "Jean", lastName: "Dupont" }));

    expect(response.status).toBe(401);
  });

  it("crée un patient rattaché au praticien courant", async () => {
    const practitioner = await createPractitioner();
    asPractitioner(practitioner.id);

    const response = await POST(postRequest({ firstName: "Jean", lastName: "Dupont" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.patient.firstName).toBe("Jean");
    expect(body.patient.practitionerId).toBe(practitioner.id);
  });

  it("rejette des données invalides", async () => {
    const practitioner = await createPractitioner();
    asPractitioner(practitioner.id);

    const response = await POST(postRequest({ firstName: "", lastName: "Dupont" }));

    expect(response.status).toBe(422);
  });

  it("rejette un champ personnalisé appartenant à un autre praticien", async () => {
    const practitionerA = await createPractitioner();
    const practitionerB = await createPractitioner();
    asPractitioner(practitionerB.id);

    // Champ personnalisé créé pour A, référencé par une requête authentifiée en B.
    const { rows } = await pool.query(
      `INSERT INTO custom_field_definitions (practitioner_id, field_name, field_type)
       VALUES ($1, 'Allergies', 'text') RETURNING id`,
      [practitionerA.id]
    );

    const response = await POST(
      postRequest({
        firstName: "Jean",
        lastName: "Dupont",
        customFields: [{ fieldDefinitionId: rows[0].id, value: "Pollen" }],
      })
    );

    expect(response.status).toBe(422);
  });
});
