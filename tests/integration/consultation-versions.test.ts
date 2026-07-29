import { describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/consultations/[id]/route";
import { GET as GET_VERSIONS, POST as CREATE_VERSION } from "@/app/api/consultations/[id]/versions/route";
import { GET as GET_VERSION } from "@/app/api/consultations/[id]/versions/[versionId]/route";
import { POST as RESTORE } from "@/app/api/consultations/[id]/versions/[versionId]/restore/route";
import pool from "@/lib/db";
import { asPractitioner } from "./helpers/auth";
import {
  createConsultation,
  createConsultationVersion,
  createPatient,
  createPractitioner,
} from "./helpers/fixtures";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function versionParams(id: string, versionId: string) {
  return { params: Promise.resolve({ id, versionId }) };
}

const OTHER_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Nouveau contenu" }] }],
};

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/consultations/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postRequest(body: unknown = {}) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function versionCount(consultationId: string) {
  const { rows } = await pool.query(
    "SELECT count(*)::int AS count FROM consultation_versions WHERE consultation_id = $1",
    [consultationId]
  );
  return rows[0].count as number;
}

describe("PATCH /api/consultations/[id] — checkpoints automatiques", () => {
  it("crée un checkpoint automatique au premier changement de contenu", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    const response = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), content: OTHER_CONTENT }),
      params(consultation.id)
    );

    expect(response.status).toBe(200);
    expect(await versionCount(consultation.id)).toBe(1);
  });

  it("ne recrée pas de checkpoint moins de 10 minutes après le précédent", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    const first = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), content: OTHER_CONTENT }),
      params(consultation.id)
    );
    const firstBody = await first.json();
    expect(await versionCount(consultation.id)).toBe(1);

    const second = await PATCH(
      patchRequest({
        updatedAt: firstBody.consultation.updatedAt,
        content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
      }),
      params(consultation.id)
    );

    expect(second.status).toBe(200);
    expect(await versionCount(consultation.id)).toBe(1);
  });

  it("recrée un checkpoint après le seuil de 10 minutes", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    await createConsultationVersion(consultation.id, {
      isManual: false,
      createdAt: new Date(Date.now() - 15 * 60_000),
    });
    expect(await versionCount(consultation.id)).toBe(1);

    const response = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), content: OTHER_CONTENT }),
      params(consultation.id)
    );

    expect(response.status).toBe(200);
    expect(await versionCount(consultation.id)).toBe(2);
  });

  it("ne crée aucun checkpoint pour un patch qui ne touche que le titre/la date", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    const response = await PATCH(
      patchRequest({ updatedAt: consultation.updatedAt.toISOString(), title: "Nouveau titre" }),
      params(consultation.id)
    );

    expect(response.status).toBe(200);
    expect(await versionCount(consultation.id)).toBe(0);
  });
});

describe("POST /api/consultations/[id]/versions — checkpoint manuel", () => {
  it("crée toujours une version manuelle, avec ou sans libellé", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    asPractitioner(practitioner.id);

    const withLabel = await CREATE_VERSION(
      postRequest({ label: "Avant réécriture" }),
      params(consultation.id)
    );
    expect(withLabel.status).toBe(201);
    const withLabelBody = await withLabel.json();
    expect(withLabelBody.version.isManual).toBe(true);
    expect(withLabelBody.version.label).toBe("Avant réécriture");

    const withoutLabel = await CREATE_VERSION(postRequest({}), params(consultation.id));
    expect(withoutLabel.status).toBe(201);
    const withoutLabelBody = await withoutLabel.json();
    expect(withoutLabelBody.version.label).toBeNull();

    expect(await versionCount(consultation.id)).toBe(2);
  });

  it("renvoie 404 pour la consultation d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const consultation = await createConsultation(patient.id);

    asPractitioner(intruder.id);
    const response = await CREATE_VERSION(postRequest({}), params(consultation.id));

    expect(response.status).toBe(404);
  });
});

describe("GET /api/consultations/[id]/versions", () => {
  it("renvoie l'historique trié du plus récent au plus ancien", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    const older = await createConsultationVersion(consultation.id, {
      createdAt: new Date(Date.now() - 60 * 60_000),
    });
    const newer = await createConsultationVersion(consultation.id, {
      createdAt: new Date(),
    });
    asPractitioner(practitioner.id);

    const response = await GET_VERSIONS(new Request("http://localhost"), params(consultation.id));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.versions.map((v: { id: string }) => v.id)).toEqual([newer.id, older.id]);
  });

  it("renvoie 404 pour la consultation d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const consultation = await createConsultation(patient.id);

    asPractitioner(intruder.id);
    const response = await GET_VERSIONS(new Request("http://localhost"), params(consultation.id));

    expect(response.status).toBe(404);
  });
});

describe("GET /api/consultations/[id]/versions/[versionId]", () => {
  it("renvoie le contenu complet de la version", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    const version = await createConsultationVersion(consultation.id, { content: OTHER_CONTENT });
    asPractitioner(practitioner.id);

    const response = await GET_VERSION(
      new Request("http://localhost"),
      versionParams(consultation.id, version.id)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version.content).toEqual(OTHER_CONTENT);
  });

  it("renvoie 404 pour la version d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const consultation = await createConsultation(patient.id);
    const version = await createConsultationVersion(consultation.id);

    asPractitioner(intruder.id);
    const response = await GET_VERSION(
      new Request("http://localhost"),
      versionParams(consultation.id, version.id)
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/consultations/[id]/versions/[versionId]/restore", () => {
  it("remplace le contenu actuel et conserve l'état pré-restauration dans l'historique", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id, { contentText: "état actuel" });
    const version = await createConsultationVersion(consultation.id, {
      content: OTHER_CONTENT,
      contentText: "état restauré",
    });
    asPractitioner(practitioner.id);

    const response = await RESTORE(
      new Request("http://localhost", { method: "POST" }),
      versionParams(consultation.id, version.id)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.consultation.content).toEqual(OTHER_CONTENT);
    expect(body.consultation.contentText).toBe("état restauré");

    // L'état juste avant restauration doit avoir été conservé.
    expect(await versionCount(consultation.id)).toBe(2);
    const { rows } = await pool.query(
      "SELECT content_text FROM consultation_versions WHERE consultation_id = $1 ORDER BY created_at DESC",
      [consultation.id]
    );
    expect(rows[0].content_text).toBe("état actuel");
  });

  it("renvoie 404 pour la version d'un autre praticien", async () => {
    const owner = await createPractitioner();
    const intruder = await createPractitioner();
    const patient = await createPatient(owner.id);
    const consultation = await createConsultation(patient.id);
    const version = await createConsultationVersion(consultation.id);

    asPractitioner(intruder.id);
    const response = await RESTORE(
      new Request("http://localhost", { method: "POST" }),
      versionParams(consultation.id, version.id)
    );

    expect(response.status).toBe(404);
  });
});

describe("Cascade de suppression", () => {
  it("supprime les versions quand la consultation est supprimée en base", async () => {
    const practitioner = await createPractitioner();
    const patient = await createPatient(practitioner.id);
    const consultation = await createConsultation(patient.id);
    await createConsultationVersion(consultation.id);
    expect(await versionCount(consultation.id)).toBe(1);

    // L'API ne fait qu'un soft-delete : ce test vérifie la contrainte FK
    // elle-même (ON DELETE CASCADE), pas un chemin applicatif.
    await pool.query("DELETE FROM consultations WHERE id = $1", [consultation.id]);

    const { rows } = await pool.query(
      "SELECT count(*)::int AS count FROM consultation_versions WHERE consultation_id = $1",
      [consultation.id]
    );
    expect(rows[0].count).toBe(0);
  });
});
