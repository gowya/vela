# Vela

Vela est un outil de suivi patient destiné aux praticiens de l'accompagnement humain (sexologues, hypnothérapeutes, coachs relationnels, sophrologues, naturopathes). L'application permet la gestion de patientèle, l'authentification des praticiens et le suivi de consultations, avec une exigence forte de discrétion, de rigueur (RGPD/HDS) et de sobriété visuelle.

Voir (vela-brand-book.md) pour l'identité de marque complète.

## Stack technique

- [Next.js](https://nextjs.org/) (App Router)
- TypeScript (mode strict)
- PostgreSQL (via `pg`, sans ORM)
- Serveur HDS (non configuré)
- NextAuth (authentification par credentials)
- Tailwind CSS v4 + shadcn/ui
- Resend (envoi d'emails transactionnels)

## Prérequis

- Node.js
- Une base de données PostgreSQL accessible localement (ex. via Docker)

## Installation

```bash
npm install
```

Copie `.env.example` en `.env.local` et renseigne les valeurs :

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Secret utilisé par NextAuth pour signer les sessions JWT |
| `NEXTAUTH_URL` | URL de base de l'application (ex. `http://localhost:3001`) |
| `RESEND_API_KEY` | Clé API Resend pour l'envoi d'emails |
| `RESEND_FROM_EMAIL` | Adresse d'expédition des emails transactionnels |
| `SUPPORT_EMAIL` | Adresse de contact affichée aux utilisateurs |

Ne commite jamais `.env.local`.

Initialise le schéma de base de données en exécutant [`src/lib/schema.sql`](src/lib/schema.sql) puis les migrations dans [`src/lib/migrations/`](src/lib/migrations) (par ordre numérique) sur ta base PostgreSQL.

## Commandes

```bash
npm run dev     # démarre le serveur de développement
npm run build   # build de production
npm run start   # démarre le serveur en mode production
npm run lint    # vérifie le code avec ESLint
```

## Architecture

- **Routage** : `src/app` (App Router), pages serveur et client mélangées selon les besoins d'interactivité.
- **Authentification** : NextAuth (`src/lib/auth.ts`), provider Credentials, hashage bcrypt, sessions JWT.
- **Accès aux données** : PostgreSQL via `pg` (`src/lib/db.ts`), requêtes SQL directes, schéma dans `src/lib/schema.sql`.
- **API** : routes sous `src/app/api` (authentification, patients, consultations, gabarits de consultation, compte praticien, pièces jointes).
- **Design system** : Tailwind CSS v4 (tokens dans `src/app/globals.css`), composants réutilisables sous `src/components/ui`.

Documentation détaillée dans le dossier [`claude/`](claude) :

- [`claude/architecture.md`](claude/architecture.md)
- [`claude/coding_conventions.md`](claude/coding_conventions.md)
- [`claude/ui_guidelines.md`](claude/ui_guidelines.md)

## Structure du projet

```
soin-app/
 ├── claude/                # Documentation détaillée du projet
 ├── src/
 │   ├── app/                # Routes (App Router) : pages, layouts, API
 │   │   ├── (dashboard)/    # Espace praticien : patients, consultations, compte
 │   │   ├── (onboarding)/   # Parcours d'onboarding praticien
 │   │   ├── api/            # Routes API
 │   │   └── login/          # Page de connexion / inscription
 │   ├── components/
 │   │   └── ui/             # Composants UI réutilisables (shadcn/ui)
 │   ├── lib/                # Logique serveur : auth, DB, schéma SQL, migrations
 │   └── types/               # Déclarations de types partagées
 ├── public/                  # Assets statiques
 ├── vela-brand-book.md       # Identité de marque complète
 └── vela-moodboard.html      # Moodboard visuel de la marque
```

## Points d'attention

- **RGPD/HDS** : les données patients sont sensibles ; toute requête doit être scopée par praticien (`practitioner_id`) et paramétrée (pas de concaténation SQL brute).
- **Accessibilité** : contrastes suffisants, labels explicites sur les formulaires, navigation clavier fonctionnelle.
- **Performance** : pas d'animation décorative, rendu serveur privilégié.
- **Tests** : aucune stratégie de test automatisé n'est en place actuellement.
