import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/consultations/route";
import { asGuest, asPractitioner } from "./helpers/auth";
import {
  createAppointment,
  createConsultation,
  createPatient,
  createPractitioner,
} from "./helpers/fixtures";

const DOC_CONTENT = { type: "doc", content: [{ type: "paragraph", content: [] }] };

function listRequest(query = "") {
  return new Request(`http://localhost/api/consultations${query}`);
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/consultations", () => {
  it("refuse une requête non authentifiée", async () => {
    asGuest();

    const response = await GET(listRequest());

    expect(response.status).toBe(401);
  });

  it("ne renvoie que les consultations des patients du praticien courant", async () => {
    const practitionerA = await createPractitioner();
    const practitionerB = await createPractitioner();
    const patientA = await createPatient(practitionerA.id);
    const patientB = await createPatient(practitionerB.id);
    await createConsultation(patientA.id, { contentText: "note A" });
    await createConsultation(patientB.id, { contentText: "note B" });

    asPractitioner(practitionerA.id);
    const response = await GET(listRequest());
    const body = await response.json();

    expect(body.consultations).toHaveLength(1);
    expect(body.consultations[0].excerpt).toBe("note A");
  });
});

describe("POST /api/consultations", () => {
  it("refuse de créer une consultation pour le patient d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);

    asPractitioner(intruder.id);
    const response = await POST(
      postRequest({ patientId: patient.id, content: DOC_CONTENT })
    );

    expect(response.status).toBe(404);
  });

  it("crée une consultation pour son propre patient", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);

    asPractitioner(practitioner.id);
    const response = await POST(
      postRequest({ patientId: patient.id, content: DOC_CONTENT })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.consultation.patientId).toBe(patient.id);
  });

  it("refuse de créer une consultation liée au rendez-vous d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const appointment = await createAppointment(patient.id);

    asPractitioner(intruder.id);
    const response = await POST(
      postRequest({ patientId: patient.id, appointmentId: appointment.id, content: DOC_CONTENT })
    );

    expect(response.status).toBe(404);
  });

  // Régression directe pour B1 (test user #01) : cliquer plusieurs fois sur le
  // même rendez-vous du Dashboard ne doit jamais créer une deuxième consultation.
  it("ne duplique pas la consultation en POSTant deux fois le même appointmentId", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const appointment = await createAppointment(patient.id);

    asPractitioner(practitioner.id);
    const first = await POST(
      postRequest({ patientId: patient.id, appointmentId: appointment.id, content: DOC_CONTENT })
    );
    const firstBody = await first.json();
    expect(first.status).toBe(201);

    const second = await POST(
      postRequest({ patientId: patient.id, appointmentId: appointment.id, content: DOC_CONTENT })
    );
    const secondBody = await second.json();

    expect(second.status).toBe(200);
    expect(secondBody.consultation.id).toBe(firstBody.consultation.id);

    const countResult = await GET(listRequest(`?patientId=${patient.id}`));
    const countBody = await countResult.json();
    expect(countBody.consultations).toHaveLength(1);
  });
});
