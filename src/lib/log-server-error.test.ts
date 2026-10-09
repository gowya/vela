import { describe, expect, it } from "vitest";
import { describeServerError } from "./log-server-error";

describe("describeServerError", () => {
  it("garde le code et le message d'une erreur Postgres, jamais le detail", () => {
    const error = Object.assign(new Error('duplicate key value violates unique constraint "patients_email_key"'), {
      code: "23505",
      table: "patients",
      constraint: "patients_email_key",
      detail: "Key (email)=(patient@exemple.fr) already exists.",
    });

    const described = describeServerError(error);

    expect(described).toMatchObject({ code: "23505", table: "patients", constraint: "patients_email_key" });
    expect(JSON.stringify(described)).not.toContain("patient@exemple.fr");
  });

  it("accepte une valeur qui n'est pas une Error", () => {
    expect(describeServerError("boom")).toEqual({ message: "boom" });
  });
});
