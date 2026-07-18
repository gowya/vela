-- Brique 8 : `last_appointment_at`/`next_appointment_at` étaient des colonnes
-- mises en cache sur `patients`, recalculées uniquement lors d'une écriture
-- sur `appointments` — jamais quand le temps passe tout seul, ce qui laissait
-- un rendez-vous passé affiché comme "prochain rdv" indéfiniment (retour
-- utilisateur). On les supprime : ces valeurs sont désormais calculées à la
-- lecture, en direct depuis `appointments`, donc toujours exactes.
-- `last_appointment_at` n'avait par ailleurs aucune interface d'édition —
-- aucune perte de donnée réelle.

ALTER TABLE patients
  DROP COLUMN last_appointment_at,
  DROP COLUMN next_appointment_at;
