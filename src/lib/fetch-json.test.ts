import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "./fetch-json";

function mockFetch(implementation: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(implementation));
}

describe("fetchJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renvoie le corps JSON d'une réponse 2xx", async () => {
    mockFetch(async () => Response.json({ versions: [] }));
    await expect(fetchJson("/api/test")).resolves.toEqual({ versions: [] });
  });

  it("renvoie null sur une 500 au corps vide au lieu de lever", async () => {
    mockFetch(async () => new Response(null, { status: 500 }));
    await expect(fetchJson("/api/test")).resolves.toBeNull();
  });

  it("renvoie null sur une erreur HTTP même avec un corps JSON", async () => {
    mockFetch(async () => Response.json({ error: "Introuvable." }, { status: 404 }));
    await expect(fetchJson("/api/test")).resolves.toBeNull();
  });

  it("renvoie null sur une 200 au corps invalide", async () => {
    mockFetch(async () => new Response("", { status: 200 }));
    await expect(fetchJson("/api/test")).resolves.toBeNull();
  });

  it("renvoie null si le réseau échoue", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(fetchJson("/api/test")).resolves.toBeNull();
  });
});
