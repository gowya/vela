# Stratégie de tests automatisés

## Philosophie

Deux niveaux, pas plus pour l'instant :

- **Tests unitaires** (`src/**/*.test.ts`) : logique pure, colocalisée avec le code qu'elle teste (`src/lib/validation.ts` → `src/lib/validation.test.ts`). Aucune I/O réseau ou DB. Rapides (< 1s pour toute la suite), lancés en boucle pendant le développement.
- **Tests d'intégration** (`tests/integration/*.test.ts`) : routes API App Router appelées directement (`GET`/`POST`/`PATCH`/`DELETE` importés depuis `src/app/api/**/route.ts`) avec de vrais objets `Request`/`Response`, contre un vrai Postgres jetable. C'est le niveau qui couvre le scoping `practitioner_id` (le point le plus critique de l'app, voir `claude/architecture.md`), l'auth, et les cascades de suppression.

**Pas de tests E2E navigateur (Playwright) pour l'instant** — décision volontaire pour garder le premier socle rapide à faire vivre. À ajouter quand l'app aura des parcours suffisamment stabilisés pour justifier leur coût de maintenance (typiquement : connexion → créer un patient → créer une consultation → recherche, en un seul scénario bout-à-bout). Si besoin : `npm create playwright`, cibler `npm run dev`, garder un nombre de specs volontairement restreint (les tests d'intégration couvrent déjà la logique métier).

## Commandes

```bash
npm run test:db:up       # démarre le Postgres de test (Docker, jetable, port 5433)
npm run test:unit        # tests unitaires (rapide, pas besoin de Docker)
npm run test:integration # tests d'intégration (nécessite test:db:up)
npm run test             # les deux
npm run test:watch       # tests unitaires en mode watch
npm run test:db:down     # arrête et supprime le Postgres de test
```

La CI (`.github/workflows/test.yml`) lance `lint` → `build` → `test:unit` → `test:integration` sur chaque push/PR, avec un service Postgres aux mêmes identifiants que `docker-compose.test.yml` — aucune différence de config entre local et CI.

## Comment la base de test est construite

`scripts/setup-test-db.mjs` reconstruit le schéma de zéro (`DROP SCHEMA public CASCADE`) puis rejoue `src/lib/schema.sql` suivi de tous les fichiers de `src/lib/migrations/*.sql` dans l'ordre — exactement la séquence documentée dans `claude/admin_runbook.md`. Ce script tourne une fois avant toute la suite d'intégration (`globalSetup` dans `vitest.integration.config.ts`).

Entre chaque test, `tests/integration/setup.ts` fait un `TRUNCATE practitioners ... CASCADE`, qui nettoie en cascade tout ce qui dépend de `practitioners` (patients, consultations, templates, etc.). Chaque test part donc d'une base vide et crée ses propres données via `tests/integration/helpers/fixtures.ts`.

## Conventions pour écrire un nouveau test

**Unitaire** : colocalisé (`mon-module.ts` → `mon-module.test.ts`), zéro mock de DB/réseau. Si le module a besoin de la date courante, figer l'horloge avec `vi.useFakeTimers()` / `vi.setSystemTime(...)` plutôt que de dépendre de l'heure d'exécution (voir `src/lib/patient-utils.test.ts`).

**Intégration** :
- Simuler la session avec `asPractitioner(id)` / `asGuest()` (`tests/integration/helpers/auth.ts`) — jamais de vrai flux de connexion.
- Créer les données de test avec `createPractitioner()` / `createPatient()` / `createConsultation()` (`tests/integration/helpers/fixtures.ts`), pas en passant par les routes API sauf si la route elle-même est ce qu'on teste (ex. `signup.test.ts`).
- `@/lib/email` est mocké globalement (`tests/integration/setup.ts`) : jamais d'appel réseau réel vers Resend. Importer la fonction mockée pour vérifier qu'elle a été appelée (`expect(sendVerificationEmail).toHaveBeenCalledWith(...)`).
- Tout ce qui touche au scoping `practitioner_id` (patients, consultations, custom fields) doit avoir un test qui crée deux praticiens et vérifie que l'un ne voit/modifie jamais les données de l'autre.
- Piège connu : `authOptions.providers[0].authorize` est un stub qui renvoie toujours `null` — le vrai `authorize` défini dans `src/lib/auth.ts` n'est accessible en dehors d'une vraie requête next-auth que via `authOptions.providers[0].options.authorize` (voir le commentaire en tête de `tests/integration/auth.test.ts`).

## Préparation à l'upgrade Next.js

Les tests de routes reposent uniquement sur les Web Standards (`Request`/`Response`) que Next.js expose déjà côté App Router — ils n'invoquent jamais de serveur Next et ne dépendent donc pas des détails internes du framework. Avant/après une upgrade (14 → 15/16) :

1. `npm run test` doit rester vert sans modification.
2. `npm run build` valide que le code compile toujours avec la nouvelle version.
3. Si une upgrade change la forme des route handlers (ex. signature de `params`), les échecs de compilation TypeScript apparaîtront avant même de lancer les tests.
