import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { POST as requestReset } from "@/app/api/auth/forgot-password/route";
import { POST as applyReset } from "@/app/api/auth/reset-password/route";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import pool from "@/lib/db";
import { createPractitioner } from "./helpers/fixtures";

// `after()` n'existe que dans le contexte d'une vraie requête Next : ici, la
// tâche (l'envoi d'email) est exécutée immédiatement.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (task: () => unknown) => task() };
});

let ipCounter = 0;
// Une IP par appel par défaut, pour ne pas déclencher la limite par IP dans
// les tests qui ne la visent pas.
function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter % 250}`;
}

function forgotRequest(body: unknown, ip = nextIp()) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function resetRequest(body: unknown, ip = nextIp()) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function lastSentToken(): string {
  const calls = vi.mocked(sendPasswordResetEmail).mock.calls;
  return calls[calls.length - 1][1];
}

async function insertToken(practitionerId: string, token: string, expiresAt: Date) {
  await pool.query(
    `INSERT INTO password_reset_tokens (practitioner_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [practitionerId, hashPasswordResetToken(token), expiresAt]
  );
}

beforeEach(() => {
  vi.mocked(sendPasswordResetEmail).mockClear();
});

describe("POST /api/auth/forgot-password", () => {
  it("envoie un lien et ne stocke que le hash du jeton, valable 1 h", async () => {
    const practitioner = await createPractitioner({ email: "known@example.test" });

    const response = await requestReset(forgotRequest({ email: "Known@Example.test " }));

    expect(response.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("known@example.test", expect.any(String));
    const token = lastSentToken();

    const { rows } = await pool.query(
      "SELECT token_hash, expires_at FROM password_reset_tokens WHERE practitioner_id = $1",
      [practitioner.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toBe(hashPasswordResetToken(token));
    expect(rows[0].token_hash).not.toBe(token);

    const ttl = new Date(rows[0].expires_at).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(59 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("répond la même chose pour un email inconnu, sans rien envoyer", async () => {
    await createPractitioner({ email: "known@example.test" });

    const known = await requestReset(forgotRequest({ email: "known@example.test" }));
    vi.mocked(sendPasswordResetEmail).mockClear();
    const unknown = await requestReset(forgotRequest({ email: "unknown@example.test" }));

    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(await known.json());
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("invalide le lien précédent quand un nouveau est demandé", async () => {
    const practitioner = await createPractitioner();

    await requestReset(forgotRequest({ email: practitioner.email }));
    const firstToken = lastSentToken();
    await requestReset(forgotRequest({ email: practitioner.email }));

    const { rows } = await pool.query(
      "SELECT token_hash FROM password_reset_tokens WHERE practitioner_id = $1",
      [practitioner.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(hashPasswordResetToken(firstToken));
  });

  it("refuse un email invalide", async () => {
    const response = await requestReset(forgotRequest({ email: "pas-un-email" }));

    expect(response.status).toBe(422);
  });

  it("n'envoie plus rien après 3 demandes pour le même email, sans le signaler", async () => {
    const practitioner = await createPractitioner();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await requestReset(forgotRequest({ email: practitioner.email }));
    }
    vi.mocked(sendPasswordResetEmail).mockClear();

    const response = await requestReset(forgotRequest({ email: practitioner.email }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("bloque après 5 demandes depuis la même IP en une heure", async () => {
    const ip = "203.0.113.42";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await requestReset(forgotRequest({ email: `attempt-${attempt}@example.test` }, ip));
    }

    const response = await requestReset(forgotRequest({ email: "sixth@example.test" }, ip));

    expect(response.status).toBe(429);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("parcours complet : le lien reçu permet de changer le mot de passe", async () => {
    const practitioner = await createPractitioner({ password: "ancien-mot-de-passe" });
    await requestReset(forgotRequest({ email: practitioner.email }));

    const response = await applyReset(
      resetRequest({ token: lastSentToken(), password: "nouveau-mdp" })
    );

    expect(response.status).toBe(200);
    const { rows } = await pool.query("SELECT password_hash FROM practitioners WHERE id = $1", [
      practitioner.id,
    ]);
    expect(await bcrypt.compare("nouveau-mdp", rows[0].password_hash)).toBe(true);
    expect(await bcrypt.compare("ancien-mot-de-passe", rows[0].password_hash)).toBe(false);
  });

  it("refuse de réutiliser un lien déjà utilisé", async () => {
    const practitioner = await createPractitioner();
    await requestReset(forgotRequest({ email: practitioner.email }));
    const token = lastSentToken();

    await applyReset(resetRequest({ token, password: "premier-mdp" }));
    const second = await applyReset(resetRequest({ token, password: "second-mdp" }));

    expect(second.status).toBe(400);
    const { rows } = await pool.query("SELECT password_hash FROM practitioners WHERE id = $1", [
      practitioner.id,
    ]);
    expect(await bcrypt.compare("premier-mdp", rows[0].password_hash)).toBe(true);
  });

  it("n'accepte qu'une seule des deux requêtes simultanées avec le même lien", async () => {
    const practitioner = await createPractitioner();
    await insertToken(practitioner.id, "jeton-concurrent", new Date(Date.now() + 60_000));

    const responses = await Promise.all([
      applyReset(resetRequest({ token: "jeton-concurrent", password: "mdp-numero-un" })),
      applyReset(resetRequest({ token: "jeton-concurrent", password: "mdp-numero-deux" })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
  });

  it("refuse un lien expiré", async () => {
    const practitioner = await createPractitioner({ password: "ancien-mot-de-passe" });
    await insertToken(practitioner.id, "jeton-expire", new Date(Date.now() - 1000));

    const response = await applyReset(
      resetRequest({ token: "jeton-expire", password: "nouveau-mdp" })
    );

    expect(response.status).toBe(400);
    const { rows } = await pool.query("SELECT password_hash FROM practitioners WHERE id = $1", [
      practitioner.id,
    ]);
    expect(await bcrypt.compare("ancien-mot-de-passe", rows[0].password_hash)).toBe(true);
  });

  it("refuse un lien inconnu, y compris le hash stocké passé tel quel", async () => {
    const practitioner = await createPractitioner();
    await insertToken(practitioner.id, "vrai-jeton", new Date(Date.now() + 60_000));

    const unknown = await applyReset(resetRequest({ token: "faux-jeton", password: "nouveau-mdp" }));
    const hashAsToken = await applyReset(
      resetRequest({ token: hashPasswordResetToken("vrai-jeton"), password: "nouveau-mdp" })
    );

    expect(unknown.status).toBe(400);
    expect(hashAsToken.status).toBe(400);
  });

  it("exige 8 caractères minimum, sans consommer le lien", async () => {
    const practitioner = await createPractitioner();
    await insertToken(practitioner.id, "jeton-valide", new Date(Date.now() + 60_000));

    const tooShort = await applyReset(resetRequest({ token: "jeton-valide", password: "7-chars" }));
    expect(tooShort.status).toBe(422);

    const exactly8 = await applyReset(resetRequest({ token: "jeton-valide", password: "8-chars!" }));
    expect(exactly8.status).toBe(200);
  });

  it("bloque après 10 tentatives depuis la même IP en 15 minutes", async () => {
    const ip = "203.0.113.77";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await applyReset(resetRequest({ token: `faux-${attempt}`, password: "nouveau-mdp" }, ip));
    }

    const response = await applyReset(resetRequest({ token: "faux-11", password: "nouveau-mdp" }, ip));

    expect(response.status).toBe(429);
  });
});
