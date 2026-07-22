import type { Pool, PoolClient } from "pg";

// Résout la durée effective d'un rendez-vous : si un type est choisi, sa durée
// fait foi (jamais celle envoyée par le client, pour éviter toute
// incohérence/tampering) ; sinon la durée manuelle fournie est utilisée.
// `null` signifie que le type demandé n'appartient pas au praticien.
export async function resolveAppointmentDuration(
  db: Pool | PoolClient,
  practitionerId: string,
  appointmentTypeId: string | null | undefined,
  manualDurationMinutes: number | undefined
): Promise<{ durationMinutes: number; appointmentTypeId: string | null } | null> {
  if (!appointmentTypeId) {
    return { durationMinutes: manualDurationMinutes ?? 50, appointmentTypeId: null };
  }

  const { rows } = await db.query(
    "SELECT duration_minutes FROM appointment_types WHERE id = $1 AND practitioner_id = $2",
    [appointmentTypeId, practitionerId]
  );
  if (rows.length === 0) {
    return null;
  }

  return { durationMinutes: rows[0].duration_minutes, appointmentTypeId };
}

// Prochain/dernier rendez-vous d'un patient : toujours calculés en direct
// depuis `appointments` plutôt que mis en cache (voir migration 012 — une
// colonne mise en cache ne se met jamais à jour toute seule quand le temps
// passe, ce qui laissait un rendez-vous passé affiché comme "prochain rdv"
// indéfiniment). Suppose que la requête aliase `patients` en `p`.
export const NEXT_APPOINTMENT_AT_SQL = `(SELECT MIN(scheduled_at) FROM appointments WHERE patient_id = p.id AND cancelled_at IS NULL AND scheduled_at > now())`;
export const LAST_APPOINTMENT_AT_SQL = `(SELECT MAX(scheduled_at) FROM appointments WHERE patient_id = p.id AND cancelled_at IS NULL AND scheduled_at <= now())`;
