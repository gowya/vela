import type { Pool, PoolClient } from "pg";

// `patients.next_appointment_at` est une valeur dérivée, jamais écrite directement :
// un patient peut avoir plusieurs rendez-vous actifs futurs (planifiés depuis l'onglet
// Rendez-vous), donc "le prochain" doit être recalculé plutôt que recopié depuis le
// dernier rendez-vous touché — sinon un patient avec un rdv proche déjà planifié pourrait
// se voir attribuer une date plus lointaine par erreur.
export async function syncPatientNextAppointment(
  db: Pool | PoolClient,
  patientId: string
): Promise<void> {
  await db.query(
    `UPDATE patients SET next_appointment_at = (
       SELECT MIN(scheduled_at) FROM appointments
       WHERE patient_id = $1 AND cancelled_at IS NULL AND scheduled_at > now()
     ) WHERE id = $1`,
    [patientId]
  );
}
