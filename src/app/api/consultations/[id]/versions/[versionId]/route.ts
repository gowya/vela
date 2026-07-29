import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapConsultationVersionDetailRow } from "@/lib/mappers";

// Route détail séparée de la liste (GET /versions) pour ne jamais envoyer tous
// les documents JSONB complets d'un coup — même logique que
// mapConsultationListItemRow vs mapConsultationRow.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id, versionId } = await params;

  const { rows } = await pool.query(
    `SELECT v.id, v.consultation_id, v.is_manual, v.label, v.content, v.content_text, v.created_at
     FROM consultation_versions v
     JOIN consultations c ON c.id = v.consultation_id
     JOIN patients p ON p.id = c.patient_id
     WHERE v.id = $1 AND v.consultation_id = $2 AND p.practitioner_id = $3 AND c.deleted_at IS NULL`,
    [versionId, id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Version introuvable." }, { status: 404 });
  }

  return NextResponse.json({ version: mapConsultationVersionDetailRow(rows[0]) });
}
