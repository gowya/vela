# Runbook admin — opérations manuelles en base

Ce document remplace un outil d'administration dédié tant que le volume
d'utilisateurs reste gérable à la main. Toutes les opérations se font via
`psql` connecté à `DATABASE_URL` (Clever Cloud en prod, Postgres local en
dev — voir `src/lib/db.ts`).

```bash
psql "$DATABASE_URL"
```

Règle générale : toujours lancer le `SELECT` de vérification d'une section
avant la requête destructive qui suit. Ne jamais lancer un `DELETE`/`UPDATE`
sans `WHERE` explicite sur un `id` connu.

## 1. Retrouver un praticien (ID, statut, autorisations)

```sql
SELECT id, email, first_name, last_name, specialty,
       email_verified_at, onboarding_completed_at, created_at
FROM practitioners
WHERE email ILIKE '%exemple%'
ORDER BY created_at DESC;
```

Pour lister tous les comptes récents :

```sql
SELECT id, email, first_name, last_name, created_at
FROM practitioners
ORDER BY created_at DESC
LIMIT 50;
```

## 2. Voir les patients rattachés à un praticien

```sql
SELECT id, first_name, last_name, email, phone, created_at
FROM patients
WHERE practitioner_id = '<practitioner_id>'
ORDER BY created_at DESC;
```

## 3. Export des données d'un praticien (droit à la portabilité RGPD)

Exporte tout ce qui appartient au praticien (lui-même, ses patients, leurs
consultations, réponses aux QCM) en JSON, à transmettre à l'utilisateur qui
en fait la demande.

```sql
SELECT jsonb_pretty(jsonb_build_object(
  'practitioner', (SELECT to_jsonb(p) FROM practitioners p WHERE id = '<practitioner_id>'),
  'patients', (SELECT jsonb_agg(to_jsonb(pat)) FROM patients pat WHERE practitioner_id = '<practitioner_id>'),
  'consultations', (
    SELECT jsonb_agg(to_jsonb(c))
    FROM consultations c
    JOIN patients pat ON pat.id = c.patient_id
    WHERE pat.practitioner_id = '<practitioner_id>'
  ),
  'qcm_responses', (
    SELECT jsonb_agg(to_jsonb(r))
    FROM qcm_responses r
    JOIN patients pat ON pat.id = r.patient_id
    WHERE pat.practitioner_id = '<practitioner_id>'
  )
));
```

Copier la sortie dans un fichier `.json` à remettre au praticien. Ne jamais
transmettre ce fichier par un canal non chiffré (privilégier un lien
d'envoi temporaire ou un email chiffré, vu la sensibilité des données
patient).

## 4. Supprimer un compte praticien (droit à l'effacement RGPD)

Le schéma est conçu pour que ce soit une opération unique et sûre : toutes
les tables dépendantes ont `ON DELETE CASCADE` vers `practitioners`
(`patients`, `consultations`, `qcm_forms`, `qcm_responses`, `feedback`,
`email_verification_tokens` — voir `src/lib/schema.sql`).

Vérifier d'abord ce qui va être supprimé :

```sql
SELECT id, email, first_name, last_name FROM practitioners WHERE id = '<practitioner_id>';
SELECT count(*) FROM patients WHERE practitioner_id = '<practitioner_id>';
```

Si un export RGPD a été demandé, le faire (section 3) avant de supprimer.
Puis :

```sql
DELETE FROM practitioners WHERE id = '<practitioner_id>';
```

Confirme la suppression en cascade :

```sql
SELECT count(*) FROM patients WHERE practitioner_id = '<practitioner_id>'; -- doit renvoyer 0
```

## 5. Vérifier manuellement un email (si l'envoi Resend a échoué)

```sql
UPDATE practitioners SET email_verified_at = now() WHERE id = '<practitioner_id>';
```

## 6. Restaurer des données

Il n'existe pas de mécanisme de restauration ciblée (pas de soft-delete, pas
de table d'archivage) — une suppression via la section 4 est définitive côté
application. Deux options selon la situation :

- **Restauration ponctuelle après une erreur manuelle** : avant toute
  opération destructive risquée sur des données existantes, faire une copie
  de sauvegarde dans une table temporaire :
  ```sql
  CREATE TABLE _backup_patients_20260708 AS
  SELECT * FROM patients WHERE practitioner_id = '<practitioner_id>';
  ```
  Permet de revenir en arrière avec un `INSERT INTO patients SELECT * FROM _backup_...`
  si l'opération suivante s'avère incorrecte. Supprimer la table `_backup_*`
  une fois l'opération validée.
- **Restauration après une perte de données plus large** (bug, suppression
  accidentelle non anticipée) : dépend des sauvegardes automatiques de
  l'hébergeur (Clever Cloud). Vérifier la politique de rétention/PITR dans
  la console Clever Cloud de l'addon Postgres — aucune restauration n'est
  possible depuis l'application elle-même.

## 7. Appliquer les migrations de schéma

Les fichiers de `src/lib/migrations/` ne s'appliquent jamais tout seuls : ni le
merge ni le déploiement Vercel ne touchent la base. La table `schema_migrations`
garde la trace de ceux déjà joués. Une migration mergée mais pas appliquée casse
la prod (cas réel : la 014 manquante faisait échouer toute sauvegarde de
consultation en 500).

```bash
npm run db:migrate:status   # liste les migrations en attente (exit 1 s'il y en a)
npm run db:migrate          # les applique, une transaction par fichier
```

Les deux commandes visent le `DATABASE_URL` que charge `next dev`
(`.env.development.local` en priorité, puis `.env.local`), à vérifier sur la
ligne `Base :` affichée en premier. **À lancer après chaque merge sur `main`
qui ajoute un fichier de migration**, idéalement avant que le déploiement
n'arrive en prod (les migrations restent additives : l'ancien code tourne
encore avec le nouveau schéma).

Si une migration échoue, elle est annulée entièrement et les suivantes ne sont
pas jouées : corriger le fichier, puis relancer.

Sur une base créée avant ce suivi (table `schema_migrations` absente), vérifier
d'abord à la main que le schéma correspond bien à toutes les migrations, puis
les marquer comme appliquées sans les exécuter :

```bash
npm run db:migrate -- --baseline
```

## Limites de cette approche

Ce runbook suffit tant que ces opérations restent occasionnelles et
réalisées par une personne à l'aise avec SQL. Signal pour construire un
véritable outil d'admin (UI avec authentification dédiée, journalisation
des actions) : ces opérations deviennent hebdomadaires, ou une personne
non-technique doit pouvoir les effectuer.
