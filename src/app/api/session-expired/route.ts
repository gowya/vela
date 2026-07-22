import { NextResponse } from "next/server";

const SESSION_COOKIE_NAMES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

// Cookies ne peuvent être modifiés que dans une Server Action ou un Route
// Handler (jamais dans un layout serveur) : ce endpoint sert d'unique point
// d'effacement pour une session orpheline (practitioner introuvable).
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login?session=expired", request.url));
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  return response;
}
