import { describe, expect, it } from "vitest";
import { GET, PATCH } from "@/app/api/patients/[id]/route";
import pool from "@/lib/db";
import { asGuest, asPractitioner } from "./helpers/auth";
import { createPatient, createPractitioner } from "./helpers/fixtures";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/patients/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/patients/[id]", () => {
  it("refuse une requête non authentifiée", async () => {
    asGuest();

    const response = await GET(new Request("http://localhost"), params("any-id"));

    expect(response.status).toBe(401);
  });

  it("renvoie 404 (pas 403) pour le patient d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);

    asPractitioner(intruder.id);
    const response = await GET(new Request("http://localhost"), params(patient.id));

    expect(response.status).toBe(404);
  });

  it("renvoie le patient et ses champs personnalisés pour son propriétaire", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id, { firstName: "Alice" });

    asPractitioner(practitioner.id);
    const response = await GET(new Request("http://localhost"), params(patient.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.patient.firstName).toBe("Alice");
    expect(body.customFields).toEqual([]);
  });
});

describe("PATCH /api/patients/[id]", () => {
  it("ne permet pas de modifier le patient d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id, { firstName: "Alice" });

    asPractitioner(intruder.id);
    const response = await PATCH(patchRequest({ firstName: "Piraté" }), params(patient.id));

    expect(response.status).toBe(404);

    const { rows } = await pool.query("SELECT first_name FROM patients WHERE id = $1", [
      patient.id,
    ]);
    expect(rows[0].first_name).toBe("Alice");
  });

  it("applique une mise à jour partielle", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id, {
      firstName: "Alice",
      lastName: "Martin",
    });

    asPractitioner(practitioner.id);
    const response = await PATCH(patchRequest({ status: "active" }), params(patient.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.patient.firstName).toBe("Alice");
    expect(body.patient.status).toBe("active");
  });

  it("crée un rendez-vous réel quand nextAppointmentAt est fixé", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    asPractitioner(practitioner.id);
    const response = await PATCH(
      patchRequest({ nextAppointmentAt: scheduledAt }),
      params(patient.id)
    );
    expect(response.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT scheduled_at, cancelled_at FROM appointments WHERE patient_id = $1",
      [patient.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cancelled_at).toBeNull();
    expect(new Date(rows[0].scheduled_at).toISOString()).toBe(scheduledAt);
  });

  it("met à jour (et ne duplique pas) le rendez-vous actif existant", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const firstDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const secondDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    asPractitioner(practitioner.id);
    await PATCH(patchRequest({ nextAppointmentAt: firstDate }), params(patient.id));
    await PATCH(patchRequest({ nextAppointmentAt: secondDate }), params(patient.id));

    const { rows } = await pool.query(
      "SELECT scheduled_at FROM appointments WHERE patient_id = $1 AND cancelled_at IS NULL",
      [patient.id]
    );
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].scheduled_at).toISOString()).toBe(secondDate);
  });

  it("annule le rendez-vous actif quand nextAppointmentAt est mis à null", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    asPractitioner(practitioner.id);
    await PATCH(patchRequest({ nextAppointmentAt: scheduledAt }), params(patient.id));
    await PATCH(patchRequest({ nextAppointmentAt: null }), params(patient.id));

    const { rows } = await pool.query(
      "SELECT cancelled_at FROM appointments WHERE patient_id = $1",
      [patient.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cancelled_at).not.toBeNull();
  });
});
