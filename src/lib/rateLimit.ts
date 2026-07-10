import pool from "@/lib/db";

interface RateLimitOptions {
  // Préfixé par l'appelant (ex. "login:<email>", "signup:<ip>") pour isoler
  // les compteurs entre les différentes routes protégées.
  key: string;
  limit: number;
  windowMs: number;
}

// Purge opportuniste plutôt qu'un job planifié dédié (aucune infra de cron
// n'existe encore dans le projet) : à faible probabilité pour ne pas
// alourdir chaque appel, suffisant vu le volume attendu.
const CLEANUP_PROBABILITY = 0.05;

export async function consumeRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);

  if (Math.random() < CLEANUP_PROBABILITY) {
    await pool.query("DELETE FROM rate_limit_attempts WHERE created_at < now() - interval '1 day'");
  }

  const { rows } = await pool.query(
    "SELECT count(*)::int AS count FROM rate_limit_attempts WHERE bucket_key = $1 AND created_at > $2",
    [key, windowStart]
  );

  if (rows[0].count >= limit) {
    return false;
  }

  await pool.query("INSERT INTO rate_limit_attempts (bucket_key) VALUES ($1)", [key]);
  return true;
}
