import crypto from "crypto";

// Plus court que la vérification d'email (24 h) : le lien donne un accès
// complet au compte, la fenêtre d'exploitation doit rester courte en cas
// d'interception (boîte mail partagée, email transféré...).
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Seul ce hash est stocké en base (voir migration 015). SHA-256 suffit, pas
// besoin de bcrypt : le jeton fait 256 bits aléatoires, il n'y a rien à
// ralentir côté force brute, et un hash déterministe permet la recherche par
// index.
export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
