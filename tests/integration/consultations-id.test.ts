import { describe, expect, it } from "vitest";
import { DELETE, GET, PATCH } from "@/app/api/consultations/[id]/route";
import pool from "@/lib/db";
import { asPractitioner } from "./helpers/auth";
import { createConsultation, createPatient, createPractitioner } from "./helpers/fixtures";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/consultations/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/consultations/[id]", () => {
  it("renvoie 404 pour la consultation d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const consultation = await createConsultation(patient.id);

    asPractitioner(intruder.id);
    const response = await GET(new Request("http://localhost"), params(consultation.id));

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/consultations/[id]", () => {
  it("rejette une mise à jour basée sur un updatedAt périmé (verrou optimiste)", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    // Première sauvegarde : avance updated_at en base.
    const first = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), title: "V1" }),
      params(consultation.id)
    );
    expect(first.status).toBe(200);

    // Seconde sauvegarde basée sur l'ancien horodatage (autosave concurrent) : doit être rejetée.
    const stale = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), title: "V2 (obsolète)" }),
      params(consultation.id)
    );

    expect(stale.status).toBe(409);
  });

  it("ne permet pas de modifier la consultation d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const consultation = await createConsultation(patient.id);

    asPractitioner(intruder.id);
    const response = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), title: "Piraté" }),
      params(consultation.id)
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/consultations/[id]", () => {
  it("masque la consultation (suppression douce) sans la supprimer de la base", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    const deleteResponse = await DELETE(new Request("http://localhost"), params(consultation.id));
    expect(deleteResponse.status).toBe(200);

    // Une lecture ultérieure ne doit plus la trouver (deleted_at IS NULL dans la requête).
    const getResponse = await GET(new Request("http://localhost"), params(consultation.id));
    expect(getResponse.status).toBe(404);

    const { rows } = await pool.query(
      "SELECT deleted_at FROM consultations WHERE id = $1",
      [consultation.id]
    );
    expect(rows[0].deleted_at).not.toBeNull();
  });
});
