import { describe, expect, it } from "vitest";
import { hashPasswordResetToken, PASSWORD_RESET_TOKEN_TTL_MS } from "./password-reset-token";

describe("hashPasswordResetToken", () => {
  it("renvoie un SHA-256 hexadécimal différent du jeton", () => {
    const hash = hashPasswordResetToken("un-jeton");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe("un-jeton");
  });

  it("est déterministe, pour retrouver le jeton en base", () => {
    expect(hashPasswordResetToken("un-jeton")).toBe(hashPasswordResetToken("un-jeton"));
    expect(hashPasswordResetToken("un-jeton")).not.toBe(hashPasswordResetToken("un-autre"));
  });
});

describe("PASSWORD_RESET_TOKEN_TTL_MS", () => {
  it("correspond à 1 heure", () => {
    expect(PASSWORD_RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });
});
