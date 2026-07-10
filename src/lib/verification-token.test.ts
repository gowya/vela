import { describe, expect, it } from "vitest";
import { generateVerificationToken, VERIFICATION_TOKEN_TTL_MS } from "./verification-token";

describe("generateVerificationToken", () => {
  it("génère un token hexadécimal de 64 caractères (256 bits)", () => {
    const token = generateVerificationToken();

    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("génère un token différent à chaque appel", () => {
    const a = generateVerificationToken();
    const b = generateVerificationToken();

    expect(a).not.toBe(b);
  });
});

describe("VERIFICATION_TOKEN_TTL_MS", () => {
  it("correspond à 24 heures", () => {
    expect(VERIFICATION_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
