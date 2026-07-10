import { describe, expect, it } from "vitest";
import { sanitizePhoneInput } from "./phone";

describe("sanitizePhoneInput", () => {
  it("conserve les chiffres, espaces et le préfixe international", () => {
    expect(sanitizePhoneInput("+33 6 12 34 56 78")).toBe("+33 6 12 34 56 78");
  });

  it("retire les lettres et la ponctuation", () => {
    expect(sanitizePhoneInput("06.12-34-56 (78) abc")).toBe("06123456 78 ");
  });
});
