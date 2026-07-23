import JSZip from "jszip";
import pool from "@/lib/db";

export type AccountExport = {
  zipBuffer: Buffer;
  patientsCount: number;
  consultationsCount: number;
};

// Export complet des données structurées d'un praticien (profil, patients,
// consultations, QCM, templates). Les pièces jointes de consultation (fichiers
// binaires) ne sont pas incluses dans cette première version.
export async function buildAccountExport(practitionerId: string): Promise<AccountExport> {
  const [practitionerResult, patientsResult] = await Promise.all([
    pool.query(
      `SELECT id, email, first_name, last_name, phone, specialties, created_at
       FROM practitioners WHERE id = $1`,
      [practitionerId]
    ),
    pool.query(`SELECT * FROM patients WHERE practitioner_id = $1 ORDER BY created_at`, [
      practitionerId,
    ]),
  ]);

  const patients = patientsResult.rows;
  const patientIds = patients.map((patient) => patient.id);

  const [consultationsResult, qcmFormsResult, templatesResult] = await Promise.all([
    patientIds.length > 0
      ? pool.query(
          `SELECT * FROM consultations
           WHERE patient_id = ANY($1::uuid[]) AND deleted_at IS NULL
           ORDER BY date`,
          [patientIds]
        )
      : Promise.resolve({ rows: [] }),
    pool.query(`SELECT * FROM qcm_forms WHERE practitioner_id = $1 ORDER BY created_at`, [
      practitionerId,
    ]),
    pool.query(
      `SELECT * FROM consultation_templates WHERE practitioner_id = $1 ORDER BY created_at`,
      [practitionerId]
    ),
  ]);

  const qcmFormIds = qcmFormsResult.rows.map((form) => form.id);
  const qcmResponsesResult =
    qcmFormIds.length > 0
      ? await pool.query(`SELECT * FROM qcm_responses WHERE form_id = ANY($1::uuid[])`, [
          qcmFormIds,
        ])
      : { rows: [] };

  const zip = new JSZip();
  zip.file("profil.json", JSON.stringify(practitionerResult.rows[0] ?? {}, null, 2));
  zip.file("patients.json", JSON.stringify(patients, null, 2));
  zip.file("consultations.json", JSON.stringify(consultationsResult.rows, null, 2));
  zip.file("templates_consultation.json", JSON.stringify(templatesResult.rows, null, 2));
  zip.file("qcm_formulaires.json", JSON.stringify(qcmFormsResult.rows, null, 2));
  zip.file("qcm_reponses.json", JSON.stringify(qcmResponsesResult.rows, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return {
    zipBuffer,
    patientsCount: patients.length,
    consultationsCount: consultationsResult.rows.length,
  };
}
