import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapConsultationRow } from "@/lib/mappers";

const CONSULTATION_COLUMNS = `c.id, c.patient_id, c.template_id, c.appointment_id, c.title, c.content,
  c.content_text, c.date, c.updated_at, c.created_at`;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id, versionId } = await params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: versionRows } = await client.query(
      `SELECT v.content, v.content_text
       FROM consultation_versions v
       JOIN consultations c ON c.id = v.consultation_id
       JOIN patients p ON p.id = c.patient_id
       WHERE v.id = $1 AND v.consultation_id = $2 AND p.practitioner_id = $3 AND c.deleted_at IS NULL
       FOR UPDATE OF c`,
      [versionId, id, session.user.id]
    );

    if (versionRows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Version introuvable." }, { status: 404 });
    }

    const { rows: currentRows } = await client.query(
      `SELECT content, content_text FROM consultations WHERE id = $1`,
      [id]
    );

    // On ne doit jamais perdre l'état juste avant une restauration : contrairement
    // aux checkpoints automatiques de PATCH /api/consultations/[id], celui-ci
    // n'est jamais throttlé.
    await client.query(
      `INSERT INTO consultation_versions (consultation_id, content, content_text, is_manual)
       VALUES ($1, $2, $3, false)`,
      [id, JSON.stringify(currentRows[0].content), currentRows[0].content_text]
    );

    const { rows } = await client.query(
      `UPDATE consultations c
       SET content = $1, content_text = $2, updated_at = now()
       WHERE c.id = $3
       RETURNING ${CONSULTATION_COLUMNS}`,
      [JSON.stringify(versionRows[0].content), versionRows[0].content_text, id]
    );

    await client.query("COMMIT");
    return NextResponse.json({ consultation: mapConsultationRow(rows[0]) });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "La restauration a échoué." }, { status: 500 });
  } finally {
    client.release();
  }
}
