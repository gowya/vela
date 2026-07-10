import { getServerSession } from "next-auth";
import { vi } from "vitest";
import type { Session } from "next-auth";

// Pilote le mock global de next-auth (voir tests/integration/setup.ts) pour
// simuler une session sans passer par un vrai flux de connexion.
export function asPractitioner(id: string) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as Session);
}

export function asGuest() {
  vi.mocked(getServerSession).mockResolvedValue(null);
}
