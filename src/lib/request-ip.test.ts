import { describe, expect, it } from "vitest";
import { getClientIp } from "./request-ip";

function requestWithHeaders(headers: Record<string, string>) {
  return new Request("http://localhost", { headers });
}

describe("getClientIp", () => {
  it("prend la première IP de x-forwarded-for (client d'origine)", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "203.0.113.1, 10.0.0.1, 10.0.0.2" });

    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("retire les espaces autour de l'IP", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "  203.0.113.1  , 10.0.0.1" });

    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("se rabat sur x-real-ip si x-forwarded-for est absent", () => {
    const request = requestWithHeaders({ "x-real-ip": "203.0.113.9" });

    expect(getClientIp(request)).toBe("203.0.113.9");
  });

  it("renvoie 'unknown' si aucun header n'est présent", () => {
    const request = requestWithHeaders({});

    expect(getClientIp(request)).toBe("unknown");
  });
});
