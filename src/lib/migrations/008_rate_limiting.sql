-- Aucune protection contre le brute-force n'existait sur les routes sensibles
-- (login, signup, renvoi de vérification, suppression de compte). On stocke les
-- tentatives en base plutôt qu'en mémoire process : l'app tourne potentiellement
-- sur plusieurs instances serverless (Vercel), un compteur en mémoire locale à
-- l'instance serait contournable en multipliant les requêtes.
CREATE TABLE rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_attempts_bucket_created ON rate_limit_attempts(bucket_key, created_at);
