import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Aucun header de sécurité n'était défini (ni CSP, ni nosniff, ni frame-options)
// alors que l'app manipule des données de santé. Le nonce par requête permet une
// CSP stricte (script-src limité au nonce, sans 'unsafe-inline') tout en laissant
// passer les scripts inline générés par Next.js lui-même : voir
// https://nextjs.org/docs/app/guides/content-security-policy — Next détecte le
// nonce posé sur `request.headers` et l'applique automatiquement à ses propres
// scripts. Le script inline de src/app/layout.tsx (anti-flash thème sombre)
// reçoit ce même nonce explicitement.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Le Fast Refresh de `next dev` évalue les modules rechargés via `eval()` :
  // sans 'unsafe-eval' en dev, la CSP stricte fait planter le bundle client au
  // chargement (EvalError), et plus aucun clic ne fonctionne. Le build de
  // production n'utilise pas cet eval, donc pas de relâchement en prod.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  const contentSecurityPolicy = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
