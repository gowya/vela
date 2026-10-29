import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/demo/route";
import pool from "@/lib/db";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo";
import { createPractitioner } from "./helpers/fixtures";

function demoRequest(ip = "203.0.113.1") {
  return new Request("http://localhost/api/demo", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("POST /api/demo", () => {
  it("crée un espace démo prêt à l'emploi avec des identifiants valides", async () => {
    const response = await POST(demoRequest());
    expect(response.status).toBe(201);

    const { email, password } = await response.json();
    expect(email).toMatch(new RegExp(`@${DEMO_EMAIL_DOMAIN}$`));

    const { rows } = await pool.query(
      `SELECT id, password_hash, email_verified_at, onboarding_completed_at, beta_notice_dismissed_at
       FROM practitioners WHERE email = $1`,
      [email]
    );
    expect(rows).toHaveLength(1);
    expect(await bcrypt.compare(password, rows[0].password_hash)).toBe(true);
    expect(rows[0].email_verified_at).not.toBeNull();
    expect(rows[0].onboarding_completed_at).not.toBeNull();
    expect(rows[0].beta_notice_dismissed_at).not.toBeNull();

    const { rows: counts } = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM patients WHERE practitioner_id = $1) AS patients,
         (SELECT count(*)::int FROM consultations c JOIN patients p ON p.id = c.patient_id
            WHERE p.practitioner_id = $1) AS consultations,
         (SELECT count(*)::int FROM appointments a JOIN patients p ON p.id = a.patient_id
            WHERE p.practitioner_id = $1
              AND (a.scheduled_at AT TIME ZONE 'Europe/Paris')::date
                = (now() AT TIME ZONE 'Europe/Paris')::date) AS today_appointments`,
      [rows[0].id]
    );
    expect(counts[0].patients).toBeGreaterThan(0);
    expect(counts[0].consultations).toBeGreaterThan(0);
    expect(counts[0].today_appointments).toBeGreaterThan(0);
  });

  it("règle l'agenda sur 9h-20h en semaine, sans rendez-vous hors de cette plage", async () => {
    const { email } = await (await POST(demoRequest())).json();
    const { rows } = await pool.query(
      "SELECT id, opening_hours FROM practitioners WHERE email = $1",
      [email]
    );

    expect(rows[0].opening_hours.mon).toEqual({ enabled: true, start: "09:00", end: "20:00" });
    expect(rows[0].opening_hours.sun.enabled).toBe(false);

    const { rows: outOfRange } = await pool.query(
      `SELECT a.id FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE p.practitioner_id = $1
         AND ((a.scheduled_at AT TIME ZONE 'Europe/Paris')::time < '09:00'
           OR ((a.scheduled_at + make_interval(mins => a.duration_minutes))
                 AT TIME ZONE 'Europe/Paris')::time > '20:00')`,
      [rows[0].id]
    );
    expect(outOfRange).toHaveLength(0);
  });

  it("crée un espace distinct à chaque visite", async () => {
    const first = await (await POST(demoRequest())).json();
    const second = await (await POST(demoRequest())).json();

    expect(first.email).not.toBe(second.email);
  });

  it("purge les espaces démo expirés, sans toucher aux vrais comptes", async () => {
    const expired = await (await POST(demoRequest())).json();
    await pool.query(
      "UPDATE practitioners SET created_at = now() - interval '25 hours' WHERE email = $1",
      [expired.email]
    );
    const realPractitioner = await createPractitioner();
    await pool.query(
      "UPDATE practitioners SET created_at = now() - interval '25 hours' WHERE id = $1",
      [realPractitioner.id]
    );

    await POST(demoRequest());

    const { rows } = await pool.query("SELECT email FROM practitioners WHERE email = ANY($1)", [
      [expired.email, realPractitioner.email],
    ]);
    expect(rows.map((row) => row.email)).toEqual([realPractitioner.email]);
  });

  it("limite le nombre de démos lancées depuis une même IP", async () => {
    for (let i = 0; i < 10; i += 1) {
      await POST(demoRequest("203.0.113.9"));
    }

    const response = await POST(demoRequest("203.0.113.9"));
    expect(response.status).toBe(429);
  });
});
