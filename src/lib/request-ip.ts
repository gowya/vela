// Vercel (et la plupart des proxys) renseignent x-forwarded-for avec la
// chaîne des IP traversées, la plus à gauche étant celle du client d'origine.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
