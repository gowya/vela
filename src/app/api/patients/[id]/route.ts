import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { LAST_APPOINTMENT_AT_SQL, NEXT_APPOINTMENT_AT_SQL } from "@/lib/appointments";
import { mapPatientRow } from "@/lib/mappers";
import { patientUpdateSchema } from "@/lib/validation";

// Suppose que la requête aliase `patients` en `p` (voir LAST/NEXT_APPOINTMENT_AT_SQL).
const PATIENT_COLUMNS = `p.id, p.practitioner_id, p.first_name, p.last_name, p.email, p.phone, p.birth_date,
  p.intake_notes, p.gender_identity, p.identified_issue, p.address, p.status,
  ${LAST_APPOINTMENT_AT_SQL} AS last_appointment_at,
  ${NEXT_APPOINTMENT_AT_SQL} AS next_appointment_at,
  p.created_at`;

// Mappe les clés camelCase du payload vers les colonnes SQL correspondantes.
// nextAppointmentAt n'y figure pas : ce n'est jamais un champ écrit directement, c'est une
// valeur dérivée de la table `appointments`, calculée à la lecture (voir migration 012).
const FIELD_TO_COLUMN: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  phone: "phone",
  birthDate: "birth_date",
  intakeNotes: "intake_notes",
  genderIdentity: "gender_identity",
  identifiedIssue: "identified_issue",
  address: "address",
  status: "status",
};

async function getOwnedPatientCustomFields(patientId: string) {
  const { rows } = await pool.query(
    `SELECT cfv.field_definition_id, cfd.field_name, cfd.field_type, cfd.options, cfd.allow_multiple, cfv.value
     FROM patient_custom_field_values cfv
     JOIN custom_field_definitions cfd ON cfd.id = cfv.field_definition_id
     WHERE cfv.patient_id = $1
     ORDER BY cfd.field_name`,
    [patientId]
  );
  return rows.map((row) => ({
    fieldDefinitionId: row.field_definition_id,
    fieldName: row.field_name,
    fieldType: row.field_type,
    options: row.options as string[] | null,
    allowMultiple: row.allow_multiple as boolean,
    value: row.value,
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT ${PATIENT_COLUMNS} FROM patients p WHERE p.id = $1 AND p.practitioner_id = $2`,
    [id, session.user.id]
  );

  const patient = rows[0];
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
  }

  const customFields = await getOwnedPatientCustomFields(id);

  return NextResponse.json({ patient: mapPatientRow(patient), customFields });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = patientUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { customFields, nextAppointmentAt, ...patientFields } = parsed.data;
  const nextAppointmentAtProvided = "nextAppointmentAt" in parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      "SELECT id FROM patients WHERE id = $1 AND practitioner_id = $2",
      [id, session.user.id]
    );
    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
    }

    const setEntries = Object.entries(patientFields).filter(
      ([, value]) => value !== undefined
    );

    if (setEntries.length > 0) {
      const setClauses = setEntries.map(
        ([key], index) => `${FIELD_TO_COLUMN[key]} = $${index + 1}`
      );
      const values = setEntries.map(([, value]) => value);
      await client.query(
        `UPDATE patients SET ${setClauses.join(", ")}
         WHERE id = $${values.length + 1} AND practitioner_id = $${values.length + 2}`,
        [...values, id, session.user.id]
      );
    }

    // Le rendez-vous "à venir" du patient est aussi une vraie ligne dans `appointments`
    // (voir migration 010) : on garde les deux synchronisés ici plutôt que de dupliquer
    // cette logique partout où nextAppointmentAt peut être modifié. Un seul rendez-vous
    // actif futur par patient est géré depuis ce champ du drawer (l'onglet Rendez-vous
    // permet d'en planifier plusieurs ; "le prochain" est de toute façon recalculé à la
    // lecture via MIN(), donc le résultat reste correct même dans ce cas).
    if (nextAppointmentAtProvided) {
      const { rows: activeAppointmentRows } = await client.query(
        `SELECT id FROM appointments
         WHERE patient_id = $1 AND cancelled_at IS NULL AND scheduled_at > now()
         ORDER BY scheduled_at ASC LIMIT 1`,
        [id]
      );
      const activeAppointmentId = activeAppointmentRows[0]?.id as string | undefined;

      if (nextAppointmentAt) {
        if (activeAppointmentId) {
          await client.query(
            `UPDATE appointments SET scheduled_at = $1, updated_at = now() WHERE id = $2`,
            [nextAppointmentAt, activeAppointmentId]
          );
        } else {
          await client.query(
            `INSERT INTO appointments (patient_id, scheduled_at) VALUES ($1, $2)`,
            [id, nextAppointmentAt]
          );
        }
      } else if (activeAppointmentId) {
        await client.query(
          `UPDATE appointments SET cancelled_at = now(), updated_at = now() WHERE id = $1`,
          [activeAppointmentId]
        );
      }
    }

    if (customFields && customFields.length > 0) {
      const definitionIds = customFields.map((field) => field.fieldDefinitionId);
      const { rows: ownedDefinitions } = await client.query(
        `SELECT id FROM custom_field_definitions WHERE id = ANY($1::uuid[]) AND practitioner_id = $2`,
        [definitionIds, session.user.id]
      );
      if (ownedDefinitions.length !== new Set(definitionIds).size) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Un champ personnalisé référencé est invalide." },
          { status: 422 }
        );
      }

      for (const field of customFields) {
        await client.query(
          `INSERT INTO patient_custom_field_values (patient_id, field_definition_id, value, updated_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (patient_id, field_definition_id)
           DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [id, field.fieldDefinitionId, field.value ?? null]
        );
      }
    }

    const { rows } = await client.query(
      `SELECT ${PATIENT_COLUMNS} FROM patients p WHERE p.id = $1`,
      [id]
    );

    await client.query("COMMIT");

    const updatedCustomFields = await getOwnedPatientCustomFields(id);

    return NextResponse.json({
      patient: mapPatientRow(rows[0]),
      customFields: updatedCustomFields,
    });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "La mise à jour du patient a échoué." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const { rows } = await pool.query(
    "DELETE FROM patients WHERE id = $1 AND practitioner_id = $2 RETURNING id",
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
