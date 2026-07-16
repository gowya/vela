import bcrypt from "bcryptjs";
import pool from "@/lib/db";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

// Coût bcrypt réduit (4 au lieu de 12, voir src/app/api/signup/route.ts) : ces
// fixtures ne testent pas le hashing lui-même, seulement le comportement autour
// (comparaison de mot de passe) — un coût de 12 rendrait la suite lente pour rien.
export async function createPractitioner(
  overrides: { email?: string; password?: string } = {}
) {
  const email = (overrides.email ?? `${unique("practitioner")}@example.test`).toLowerCase();
  const password = overrides.password ?? "Password1234!";
  const passwordHash = bcrypt.hashSync(password, 4);

  const { rows } = await pool.query(
    `INSERT INTO practitioners (email, password_hash, first_name, last_name)
     VALUES ($1, $2, 'Test', 'Praticien')
     RETURNING id, email`,
    [email, passwordHash]
  );

  return { id: rows[0].id as string, email: rows[0].email as string, password };
}

export async function createPatient(
  practitionerId: string,
  overrides: { firstName?: string; lastName?: string; email?: string | null } = {}
) {
  const { rows } = await pool.query(
    `INSERT INTO patients (practitioner_id, first_name, last_name, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      practitionerId,
      overrides.firstName ?? "Jean",
      overrides.lastName ?? "Dupont",
      overrides.email ?? null,
    ]
  );
  return { id: rows[0].id as string };
}

const DEFAULT_CONTENT = { type: "doc", content: [{ type: "paragraph", content: [] }] };

export async function createAppointment(
  patientId: string,
  overrides: { scheduledAt?: Date; cancelledAt?: Date | null } = {}
) {
  const { rows } = await pool.query(
    `INSERT INTO appointments (patient_id, scheduled_at, cancelled_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [
      patientId,
      overrides.scheduledAt ?? new Date(Date.now() + 60 * 60 * 1000),
      overrides.cancelledAt ?? null,
    ]
  );
  return { id: rows[0].id as string };
}

export async function createConsultation(
  patientId: string,
  overrides: { content?: object; contentText?: string } = {}
) {
  const { rows } = await pool.query(
    `INSERT INTO consultations (patient_id, content, content_text)
     VALUES ($1, $2, $3)
     RETURNING id, updated_at`,
    [
      patientId,
      JSON.stringify(overrides.content ?? DEFAULT_CONTENT),
      overrides.contentText ?? "",
    ]
  );
  return { id: rows[0].id as string, updatedAt: rows[0].updated_at as Date };
}
