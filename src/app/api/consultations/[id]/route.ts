import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { deriveContentText } from "@/lib/consultation-utils";
import { mapConsultationRow } from "@/lib/mappers";
import { consultationUpdateSchema } from "@/lib/validation";
import { logServerError } from "@/lib/log-server-error";

const CONSULTATION_COLUMNS = `c.id, c.patient_id, c.template_id, c.appointment_id, c.title, c.content,
  c.content_text, c.date, c.updated_at, c.created_at`;

// Un changement de contenu peut créer un checkpoint automatique dans l'historique
// de versions (retour test user #01, C3), throttlé pour donner quelques points par
// séance de rédaction active plutôt qu'un par autosave (débounce 800ms).
const AUTO_VERSION_THROTTLE_MINUTES = 10;

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
    `SELECT ${CONSULTATION_COLUMNS}
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  return NextResponse.json({ consultation: mapConsultationRow(rows[0]) });
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

  const parsed = consultationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { updatedAt, title, date, content } = parsed.data;

  if (!content) {
    // Patch qui ne touche que le titre/la date : pas de contenu à versionner,
    // chemin simple sans transaction (comportement inchangé).

    // Distingue le 404 (consultation inexistante/pas la sienne) du 409 (conflit
    // d'autosave) que renvoie l'UPDATE optimiste juste après.
    const { rows: existingRows } = await pool.query(
      `SELECT c.id
       FROM consultations c
       JOIN patients p ON p.id = c.patient_id
       WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
      [id, session.user.id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
    }

    const { rows } = await pool.query(
      `UPDATE consultations c
       SET title = COALESCE($1, c.title),
           date = COALESCE($2, c.date),
           updated_at = now()
       FROM patients p
       WHERE c.id = $3
         AND c.patient_id = p.id
         AND p.practitioner_id = $4
         AND c.updated_at = $5
         AND c.deleted_at IS NULL
       RETURNING ${CONSULTATION_COLUMNS}`,
      [title ?? null, date ?? null, id, session.user.id, updatedAt]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Cette consultation a été modifiée ailleurs. Rechargez-la avant de continuer." },
        { status: 409 }
      );
    }

    return NextResponse.json({ consultation: mapConsultationRow(rows[0]) });
  }

  const contentText = deriveContentText(content);

  // Verrouille la ligne pour lire l'état pré-update de façon cohérente avec
  // l'insertion éventuelle d'un checkpoint automatique, avant de l'écraser.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      `SELECT c.content, c.content_text
       FROM consultations c
       JOIN patients p ON p.id = c.patient_id
       WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL
       FOR UPDATE OF c`,
      [id, session.user.id]
    );

    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
    }

    const { rows: lastVersionRows } = await client.query(
      `SELECT created_at FROM consultation_versions
       WHERE consultation_id = $1 AND is_manual = false
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    const lastAutoVersionAt: Date | undefined = lastVersionRows[0]?.created_at;
    const shouldSnapshot =
      !lastAutoVersionAt ||
      Date.now() - new Date(lastAutoVersionAt).getTime() >
        AUTO_VERSION_THROTTLE_MINUTES * 60_000;

    if (shouldSnapshot) {
      await client.query(
        `INSERT INTO consultation_versions (consultation_id, content, content_text, is_manual)
         VALUES ($1, $2, $3, false)`,
        [id, JSON.stringify(existingRows[0].content), existingRows[0].content_text]
      );
    }

    // Verrou optimiste : la mise à jour n'a lieu que si `updated_at` n'a pas bougé
    // depuis la dernière lecture côté client (autosave depuis un autre onglet/appareil
    // sinon écraserait silencieusement les notes).
    const { rows } = await client.query(
      `UPDATE consultations c
       SET title = COALESCE($1, c.title),
           date = COALESCE($2, c.date),
           content = $3,
           content_text = $4,
           updated_at = now()
       FROM patients p
       WHERE c.id = $5
         AND c.patient_id = p.id
         AND p.practitioner_id = $6
         AND c.updated_at = $7
         AND c.deleted_at IS NULL
       RETURNING ${CONSULTATION_COLUMNS}`,
      [title ?? null, date ?? null, JSON.stringify(content), contentText, id, session.user.id, updatedAt]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Cette consultation a été modifiée ailleurs. Rechargez-la avant de continuer." },
        { status: 409 }
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ consultation: mapConsultationRow(rows[0]) });
  } catch (error) {
    logServerError("consultations.update", error);
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "La mise à jour de la consultation a échoué." },
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

  // Suppression douce : les notes de consultation sont des données de santé
  // potentiellement soumises à une obligation de conservation. On masque la
  // consultation des listes/recherche sans la supprimer réellement de la base.
  const { rows } = await pool.query(
    `UPDATE consultations c
     SET deleted_at = now()
     FROM patients p
     WHERE c.id = $1 AND c.patient_id = p.id AND p.practitioner_id = $2 AND c.deleted_at IS NULL
     RETURNING c.id`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
