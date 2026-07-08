import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { attachmentStorage } from "@/lib/attachment-storage";
import { MAX_ATTACHMENT_SIZE_BYTES, ALLOWED_ATTACHMENT_MIME_TYPES } from "@/lib/attachment-constraints";
import { mapConsultationAttachmentRow } from "@/lib/mappers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  // Même vérification d'appartenance que GET/PATCH /api/consultations/[id] :
  // une pièce jointe ne peut être rattachée qu'à une consultation du praticien
  // connecté.
  const { rows: consultationRows } = await pool.query(
    `SELECT c.id
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
    [id, session.user.id]
  );
  if (consultationRows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 422 });
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (20 Mo maximum)." },
      { status: 422 }
    );
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storageKey } = await attachmentStorage.save({ buffer });

  const { rows } = await pool.query(
    `INSERT INTO consultation_attachments (consultation_id, storage_key, file_name, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, consultation_id, file_name, mime_type, size_bytes, created_at`,
    [id, storageKey, file.name, file.type, file.size]
  );

  return NextResponse.json(
    { attachment: mapConsultationAttachmentRow(rows[0]) },
    { status: 201 }
  );
}
