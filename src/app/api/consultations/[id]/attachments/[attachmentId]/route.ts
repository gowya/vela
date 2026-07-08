import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { attachmentStorage } from "@/lib/attachment-storage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id, attachmentId } = await params;

  const { rows } = await pool.query(
    `DELETE FROM consultation_attachments a
     USING consultations c, patients p
     WHERE a.id = $1
       AND a.consultation_id = $2
       AND c.id = a.consultation_id
       AND p.id = c.patient_id
       AND p.practitioner_id = $3
     RETURNING a.storage_key`,
    [attachmentId, id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  await attachmentStorage.delete(rows[0].storage_key);

  return NextResponse.json({ ok: true });
}
