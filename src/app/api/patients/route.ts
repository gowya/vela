import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapPatientRow } from "@/lib/mappers";
import { patientCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT id, practitioner_id, first_name, last_name, email, phone, birth_date,
            intake_notes, gender_identity, identified_issue, address, status,
            last_appointment_at, next_appointment_at, created_at
     FROM patients
     WHERE practitioner_id = $1
     ORDER BY last_name, first_name`,
    [session.user.id]
  );

  // Valeurs des champs personnalisés de tous les patients du praticien, en une
  // seule requête (colonnes dynamiques du tableau) plutôt qu'un aller-retour
  // par patient.
  const { rows: customFieldValueRows } = await pool.query(
    `SELECT cfv.patient_id, cfv.field_definition_id, cfv.value
     FROM patient_custom_field_values cfv
     JOIN patients p ON p.id = cfv.patient_id
     WHERE p.practitioner_id = $1`,
    [session.user.id]
  );

  const customFieldValuesByPatient = new Map<string, Record<string, string>>();
  for (const row of customFieldValueRows) {
    const values = customFieldValuesByPatient.get(row.patient_id) ?? {};
    values[row.field_definition_id] = row.value ?? "";
    customFieldValuesByPatient.set(row.patient_id, values);
  }

  return NextResponse.json({
    patients: rows.map((row) => ({
      ...mapPatientRow(row),
      customFieldValues: customFieldValuesByPatient.get(row.id) ?? {},
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = patientCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    intakeNotes,
    genderIdentity,
    identifiedIssue,
    address,
    status,
    lastAppointmentAt,
    nextAppointmentAt,
    customFields,
  } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (customFields.length > 0) {
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
    }

    const { rows } = await client.query(
      `INSERT INTO patients (
         practitioner_id, first_name, last_name, email, phone, birth_date,
         intake_notes, gender_identity, identified_issue, address, status,
         last_appointment_at, next_appointment_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, practitioner_id, first_name, last_name, email, phone, birth_date,
                 intake_notes, gender_identity, identified_issue, address, status,
                 last_appointment_at, next_appointment_at, created_at`,
      [
        session.user.id,
        firstName,
        lastName,
        email ?? null,
        phone ?? null,
        birthDate ?? null,
        intakeNotes ?? null,
        genderIdentity ?? null,
        identifiedIssue ?? null,
        address ?? null,
        status ?? null,
        lastAppointmentAt ?? null,
        nextAppointmentAt ?? null,
      ]
    );

    const patient = rows[0];

    // Même règle de synchronisation qu'au PATCH (voir src/app/api/patients/[id]/route.ts) :
    // un prochain rendez-vous fixé à la création du patient doit exister comme une vraie
    // ligne `appointments`, sinon il n'apparaîtrait jamais sur le Dashboard.
    if (nextAppointmentAt) {
      await client.query(
        `INSERT INTO appointments (patient_id, scheduled_at) VALUES ($1, $2)`,
        [patient.id, nextAppointmentAt]
      );
    }

    for (const field of customFields) {
      await client.query(
        `INSERT INTO patient_custom_field_values (patient_id, field_definition_id, value)
         VALUES ($1, $2, $3)`,
        [patient.id, field.fieldDefinitionId, field.value ?? null]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ patient: mapPatientRow(patient) }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "La création du patient a échoué." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
