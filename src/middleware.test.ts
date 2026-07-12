import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

describe("middleware", () => {
  it("pose les headers de sécurité attendus (app manipulant des données de santé)", () => {
    const response = middleware(new NextRequest("http://localhost/patients"));

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("génère une CSP stricte avec un nonce différent à chaque requête", () => {
    const responseA = middleware(new NextRequest("http://localhost/"));
    const responseB = middleware(new NextRequest("http://localhost/"));

    const cspA = responseA.headers.get("Content-Security-Policy");
    const cspB = responseB.headers.get("Content-Security-Policy");

    expect(cspA).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(cspA).toContain("object-src 'none'");
    expect(cspA).toContain("frame-ancestors 'none'");
    expect(cspA).not.toBe(cspB);
  });
});
