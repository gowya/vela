-- Réinitialisation du mot de passe. Contrairement à email_verification_tokens,
-- on ne stocke que le SHA-256 du jeton : un lien de réinitialisation donne
-- l'accès complet au compte (et donc aux données de santé des patients), une
-- fuite de la table ne doit pas suffire à l'exploiter. Usage unique : la ligne
-- est supprimée au moment où le jeton est consommé.

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_practitioner ON password_reset_tokens(practitioner_id);
