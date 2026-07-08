-- Brique 3/4 ter : le verrou optimiste de l'autosave (PATCH /api/consultations/[id])
-- compare `updated_at` à la valeur renvoyée au client après un aller-retour en `Date`
-- JS, qui ne conserve que la milliseconde. `updated_at` étant en précision micro-
-- seconde (défaut de `now()`), l'égalité échouait donc systématiquement dès la
-- première réécriture — même sans aucune écriture concurrente. On aligne la
-- précision de la colonne sur celle que JS peut effectivement round-tripper.
ALTER TABLE consultations ALTER COLUMN updated_at TYPE TIMESTAMPTZ(3);
