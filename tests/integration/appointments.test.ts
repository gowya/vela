import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/appointments/route";
import { PATCH, DELETE } from "@/app/api/appointments/[id]/route";
import pool from "@/lib/db";
import { asGuest, asPractitioner } from "./helpers/auth";
import { createAppointment, createPatient, createPractitioner } from "./helpers/fixtures";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/appointments/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const future = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
const past = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

describe("GET /api/appointments", () => {
  it("refuse une requête non authentifiée", async () => {
    asGuest();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("ne renvoie que les rendez-vous des patients du praticien courant", async () => {
    const practitionerA = await createPractitioner();
    const practitionerB = await createPractitioner();
    const patientA = await createPatient(practitionerA.id);
    const patientB = await createPatient(practitionerB.id);
    await createAppointment(patientA.id);
    await createAppointment(patientB.id);

    asPractitioner(practitionerA.id);
    const response = await GET();
    const body = await response.json();

    expect(body.appointments).toHaveLength(1);
    expect(body.appointments[0].patientId).toBe(patientA.id);
  });
});

describe("POST /api/appointments", () => {
  it("refuse une date dans le passé", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);

    asPractitioner(practitioner.id);
    const response = await POST(
      postRequest({ patientId: patient.id, scheduledAt: past(1) })
    );

    expect(response.status).toBe(422);
  });

  it("refuse de planifier un rendez-vous pour le patient d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);

    asPractitioner(intruder.id);
    const response = await POST(
      postRequest({ patientId: patient.id, scheduledAt: future(1) })
    );

    expect(response.status).toBe(404);
  });

  it("crée le rendez-vous et met à jour next_appointment_at du patient", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const scheduledAt = future(2);

    asPractitioner(practitioner.id);
    const response = await POST(
      postRequest({ patientId: patient.id, scheduledAt })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.appointment.patientId).toBe(patient.id);

    const { rows } = await pool.query("SELECT next_appointment_at FROM patients WHERE id = $1", [
      patient.id,
    ]);
    expect(new Date(rows[0].next_appointment_at).toISOString()).toBe(scheduledAt);
  });
});

describe("PATCH /api/appointments/[id]", () => {
  it("reprogramme un rendez-vous existant", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const appointment = await createAppointment(patient.id, {
      scheduledAt: new Date(future(1)),
    });
    const newDate = future(5);

    asPractitioner(practitioner.id);
    const response = await PATCH(patchRequest({ scheduledAt: newDate }), params(appointment.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(new Date(body.appointment.scheduledAt).toISOString()).toBe(newDate);
  });

  it("refuse de reprogrammer dans le passé", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const appointment = await createAppointment(patient.id);

    asPractitioner(practitioner.id);
    const response = await PATCH(patchRequest({ scheduledAt: past(1) }), params(appointment.id));

    expect(response.status).toBe(422);
  });

  it("refuse de reprogrammer un rendez-vous déjà annulé", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const appointment = await createAppointment(patient.id, { cancelledAt: new Date() });

    asPractitioner(practitioner.id);
    const response = await PATCH(patchRequest({ scheduledAt: future(1) }), params(appointment.id));

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/appointments/[id]", () => {
  it("annule (soft) le rendez-vous", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const appointment = await createAppointment(patient.id);

    asPractitioner(practitioner.id);
    const response = await DELETE(new Request("http://localhost"), params(appointment.id));

    expect(response.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT cancelled_at FROM appointments WHERE id = $1",
      [appointment.id]
    );
    expect(rows[0].cancelled_at).not.toBeNull();
  });

  it("renvoie 404 pour un rendez-vous déjà annulé", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const appointment = await createAppointment(patient.id, { cancelledAt: new Date() });

    asPractitioner(practitioner.id);
    const response = await DELETE(new Request("http://localhost"), params(appointment.id));

    expect(response.status).toBe(404);
  });

  // Régression pour syncPatientNextAppointment : annuler le rdv le plus proche ne
  // doit pas mettre next_appointment_at à null s'il en reste un autre actif.
  it("fait remonter next_appointment_at sur le rdv actif suivant après annulation du plus proche", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const soon = new Date(future(1));
    const later = new Date(future(10));
    const soonAppointment = await createAppointment(patient.id, { scheduledAt: soon });
    await createAppointment(patient.id, { scheduledAt: later });

    asPractitioner(practitioner.id);
    const response = await DELETE(new Request("http://localhost"), params(soonAppointment.id));
    expect(response.status).toBe(200);

    const { rows } = await pool.query("SELECT next_appointment_at FROM patients WHERE id = $1", [
      patient.id,
    ]);
    expect(new Date(rows[0].next_appointment_at).toISOString()).toBe(later.toISOString());
  });
});
