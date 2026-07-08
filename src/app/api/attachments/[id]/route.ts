import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { attachmentStorage } from "@/lib/attachment-storage";

// Route de téléchargement authentifiée : les pièces jointes ne sont jamais
// exposées sous `public/` ni par URL directe vers le storage provider — on
// vérifie ici l'appartenance practitioner -> patient -> consultation -> pièce
// jointe avant de streamer le contenu.
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
    `SELECT a.storage_key, a.file_name, a.mime_type
     FROM consultation_attachments a
     JOIN consultations c ON c.id = a.consultation_id
     JOIN patients p ON p.id = c.patient_id
     WHERE a.id = $1 AND p.practitioner_id = $2`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  const { storage_key: storageKey, file_name: fileName, mime_type: mimeType } = rows[0];
  const buffer = await attachmentStorage.read(storageKey);
  if (!buffer) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const safeFileName = fileName.replace(/[\r\n"]/g, "");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
