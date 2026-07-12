import { afterAll, beforeEach, vi } from "vitest";
import pool from "@/lib/db";

// Mocks globaux (appliqués à tous les fichiers de tests d'intégration) :
// - next-auth : chaque test pilote la session via helpers/auth.ts plutôt que
//   de passer par un vrai flux de connexion.
// - email : jamais d'appel réseau réel vers Resend pendant les tests.
vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>();
  return { ...actual, getServerSession: vi.fn() };
});

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountDeletionEmail: vi.fn().mockResolvedValue(undefined),
}));

// practitioners entraîne en cascade (ON DELETE CASCADE, voir src/lib/schema.sql)
// la suppression des patients/consultations/templates/qcm/feedback/tokens/champs
// personnalisés. rate_limit_attempts et account_deletion_feedback ne référencent
// pas practitioners (anonymisés) et doivent être truncatés explicitement.
beforeEach(async () => {
  await pool.query(
    "TRUNCATE practitioners, rate_limit_attempts, account_deletion_feedback RESTART IDENTITY CASCADE"
  );
});

afterAll(async () => {
  await pool.end();
});
