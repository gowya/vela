import crypto from "crypto";

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
