import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { generateVerificationToken, VERIFICATION_TOKEN_TTL_MS } from "@/lib/verification-token";
import { consumeRateLimit } from "@/lib/rateLimit";

const RESEND_ATTEMPT_LIMIT = 3;
const RESEND_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const allowed = await consumeRateLimit({
    key: `resend-verification:${session.user.id}`,
    limit: RESEND_ATTEMPT_LIMIT,
    windowMs: RESEND_ATTEMPT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await pool.query(
    `INSERT INTO email_verification_tokens (practitioner_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [session.user.id, token, expiresAt]
  );

  await sendVerificationEmail(session.user.email, token);

  return NextResponse.json({ ok: true });
}
