import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/signup/route";
import { sendVerificationEmail } from "@/lib/email";
import pool from "@/lib/db";

function signupRequest(body: unknown, ip = "203.0.113.1") {
  return new Request("http://localhost/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/signup", () => {
  it("crée un compte et envoie un email de vérification", async () => {
    const response = await POST(
      signupRequest({
        email: "new-practitioner@example.test",
        password: "a-very-safe-password",
        consent: true,
      })
    );

    expect(response.status).toBe(201);

    const { rows } = await pool.query(
      "SELECT id, email_verified_at FROM practitioners WHERE email = $1",
      ["new-practitioner@example.test"]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].email_verified_at).toBeNull();

    const { rows: tokenRows } = await pool.query(
      "SELECT token FROM email_verification_tokens WHERE practitioner_id = $1",
      [rows[0].id]
    );
    expect(tokenRows).toHaveLength(1);

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "new-practitioner@example.test",
      tokenRows[0].token
    );
  });

  it("refuse un email déjà utilisé", async () => {
    await POST(
      signupRequest({
        email: "duplicate@example.test",
        password: "a-very-safe-password",
        consent: true,
      })
    );
    vi.mocked(sendVerificationEmail).mockClear();

    const response = await POST(
      signupRequest({
        email: "duplicate@example.test",
        password: "another-safe-password",
        consent: true,
      })
    );

    expect(response.status).toBe(409);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("refuse un mot de passe trop court", async () => {
    const response = await POST(
      signupRequest({
        email: "short-pw@example.test",
        password: "short",
        consent: true,
      })
    );

    expect(response.status).toBe(422);
  });

  it("refuse un consentement RGPD manquant", async () => {
    const response = await POST(
      signupRequest({
        email: "no-consent@example.test",
        password: "a-very-safe-password",
        consent: false,
      })
    );

    expect(response.status).toBe(422);
  });

  it("bloque après 5 tentatives depuis la même IP en une heure", async () => {
    const ip = "203.0.113.99";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await POST(
        signupRequest(
          { email: `rate-${attempt}@example.test`, password: "a-very-safe-password", consent: true },
          ip
        )
      );
    }

    const response = await POST(
      signupRequest(
        { email: "rate-6th@example.test", password: "a-very-safe-password", consent: true },
        ip
      )
    );

    expect(response.status).toBe(429);
  });
});
