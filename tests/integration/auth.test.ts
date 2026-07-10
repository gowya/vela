import { describe, expect, it } from "vitest";
import { authOptions } from "@/lib/auth";
import { createPractitioner } from "./helpers/fixtures";

// authorize() est la porte d'entrée de tout le système : identifiants valides,
// mauvais mot de passe, email inconnu, et surtout le verrouillage anti brute-force
// (voir src/lib/rateLimit.ts) doivent rester corrects après toute évolution.
//
// `.options.authorize` et non `.authorize` : le provider retourné par
// CredentialsProvider() expose un `authorize` stub (`() => null`), la vraie
// fonction n'est réinjectée par-dessus qu'au moment où next-auth traite une
// requête HTTP réelle (voir node_modules/next-auth/core/lib/providers.js).
// `options` contient toujours les arguments d'origine passés à auth.ts.
const authorize = (
  authOptions.providers[0] as unknown as {
    options: {
      authorize: (
        credentials: Record<string, string> | undefined,
        req: never
      ) => Promise<unknown>;
    };
  }
).options.authorize;

describe("authOptions credentials provider", () => {
  it("authentifie un praticien avec les bons identifiants", async () => {
    const practitioner = await createPractitioner({ email: "auth-ok@example.test" });

    const result = await authorize(
      { email: practitioner.email, password: practitioner.password },
      undefined as never
    );

    expect(result).toMatchObject({ id: practitioner.id, email: practitioner.email });
  });

  it("est insensible à la casse de l'email", async () => {
    const practitioner = await createPractitioner({ email: "auth-case@example.test" });

    const result = await authorize(
      { email: "AUTH-Case@Example.test", password: practitioner.password },
      undefined as never
    );

    expect(result).toMatchObject({ id: practitioner.id });
  });

  it("refuse un mauvais mot de passe", async () => {
    const practitioner = await createPractitioner({ email: "auth-bad-pw@example.test" });

    const result = await authorize(
      { email: practitioner.email, password: "wrong-password" },
      undefined as never
    );

    expect(result).toBeNull();
  });

  it("refuse un email inconnu", async () => {
    const result = await authorize(
      { email: "does-not-exist@example.test", password: "whatever123" },
      undefined as never
    );

    expect(result).toBeNull();
  });

  it("refuse des identifiants incomplets", async () => {
    const result = await authorize({ email: "only-email@example.test" }, undefined as never);

    expect(result).toBeNull();
  });

  it("verrouille après 5 tentatives échouées sur le même email", async () => {
    const practitioner = await createPractitioner({ email: "auth-lockout@example.test" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authorize(
        { email: practitioner.email, password: "wrong-password" },
        undefined as never
      );
    }

    // La 6e tentative est bloquée par le rate limit, même avec le bon mot de passe.
    const result = await authorize(
      { email: practitioner.email, password: practitioner.password },
      undefined as never
    );

    expect(result).toBeNull();
  });
});
