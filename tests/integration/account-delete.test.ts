import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/account/route";
import { sendAccountDeletionEmail } from "@/lib/email";
import pool from "@/lib/db";
import { asPractitioner } from "./helpers/auth";
import { createConsultation, createPatient, createPractitioner } from "./helpers/fixtures";

function deleteRequest(body: unknown) {
  return new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/account", () => {
  it("refuse un mot de passe incorrect", async () => {
    const practitioner = await createPractitioner();
    asPractitioner(practitioner.id);

    const response = await DELETE(
      deleteRequest({ password: "wrong-password", reason: "other" })
    );

    expect(response.status).toBe(401);

    const { rows } = await pool.query("SELECT id FROM practitioners WHERE id = $1", [
      practitioner.id,
    ]);
    expect(rows).toHaveLength(1);
  });

  it("supprime le compte et toutes les données rattachées en cascade", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    const response = await DELETE(
      deleteRequest({ password: practitioner.password, reason: "no_longer_needed" })
    );

    expect(response.status).toBe(200);

    const { rows: practitionerRows } = await pool.query(
      "SELECT id FROM practitioners WHERE id = $1",
      [practitioner.id]
    );
    expect(practitionerRows).toHaveLength(0);

    const { rows: patientRows } = await pool.query(
      "SELECT id FROM patients WHERE id = $1",
      [patient.id]
    );
    expect(patientRows).toHaveLength(0);

    expect(sendAccountDeletionEmail).toHaveBeenCalledWith(
      practitioner.email,
      expect.objectContaining({ patientsCount: 1, consultationsCount: 1 })
    );
  });

  it("journalise le motif de départ sans conserver le practitioner_id", async () => {
    const practitioner = await createPractitioner();
    asPractitioner(practitioner.id);

    await DELETE(deleteRequest({ password: practitioner.password, reason: "too_expensive" }));

    const { rows } = await pool.query(
      "SELECT reason FROM account_deletion_feedback WHERE reason = 'too_expensive'"
    );
    expect(rows).toHaveLength(1);
  });

  it("refuse un motif de départ invalide", async () => {
    const practitioner = await createPractitioner();
    asPractitioner(practitioner.id);

    const response = await DELETE(
      deleteRequest({ password: practitioner.password, reason: "not-a-real-reason" })
    );

    expect(response.status).toBe(422);
  });
});
