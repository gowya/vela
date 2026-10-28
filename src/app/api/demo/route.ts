import { NextResponse } from "next/server";
import { createDemoPractitioner } from "@/lib/demo";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

const DEMO_ATTEMPT_LIMIT = 10;
const DEMO_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

// POST plutôt que GET : un aperçu de lien (Slack, LinkedIn, client mail) qui
// visite /demo ne crée pas de compte, seule la page côté navigateur appelle
// cette route.
export async function POST(request: Request) {
  const allowed = await consumeRateLimit({
    key: `demo:${getClientIp(request)}`,
    limit: DEMO_ATTEMPT_LIMIT,
    windowMs: DEMO_ATTEMPT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de démos lancées depuis cette connexion. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const credentials = await createDemoPractitioner();
  return NextResponse.json(credentials, { status: 201 });
}
