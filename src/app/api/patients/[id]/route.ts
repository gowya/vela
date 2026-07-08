import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapPatientRow } from "@/lib/mappers";
import { patientUpdateSchema } from "@/lib/validation";

const PATIENT_COLUMNS = `id, practitioner_id, first_name, last_name, email, phone, birth_date,
  intake_notes, gender_identity, identified_issue, address, status,
  last_appointment_at, next_appointment_at, created_at`;

// Mappe les clés camelCase du payload vers les colonnes SQL correspondantes.
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
  lastAppointmentAt: "last_appointment_at",
  nextAppointmentAt: "next_appointment_at",
};

async function getOwnedPatientCustomFields(patientId: string) {
  const { rows } = await pool.query(
    `SELECT cfv.field_definition_id, cfd.field_name, cfd.field_type, cfv.value
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
    `SELECT ${PATIENT_COLUMNS} FROM patients WHERE id = $1 AND practitioner_id = $2`,
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

  const { customFields, ...patientFields } = parsed.data;

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
      `SELECT ${PATIENT_COLUMNS} FROM patients WHERE id = $1`,
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
