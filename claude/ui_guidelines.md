# UI Guidelines

Référence complète : `vela-brand-book.md` et `vela-moodboard.html` (racine du projet). Ce fichier résume les règles applicables au code.

## Palette

Le projet utilise la palette neutre par défaut de shadcn/ui (`baseColor: "stone"`, voir `components.json`), exprimée en tokens sémantiques standards directement dans `src/app/globals.css` (Tailwind v4, syntaxe CSS-first : `:root`/`.dark` + `@theme inline`, pas de `tailwind.config.ts`) : `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar*`.

Décision actuelle : ne pas réintroduire de tokens de couleur personnalisés (les anciens `sable`/`encre`/`vin`/`sauge`/`brume`/`blanc-chaud` ont été retirés) pour rester sur une base shadcn pure et éviter les incompatibilités Tailwind v3/v4 rencontrées lors des premiers essais. Si la palette de marque doit être réintégrée, le faire en réassignant les valeurs hex du brand book directement aux variables CSS existantes (`--primary`, `--background`, etc.) dans `globals.css`, sans ajouter de nouveaux noms de tokens.

## Typographie

Polices chargées via `next/font/google` dans `src/app/layout.tsx`, exposées en variables CSS (`--font-fraunces`, `--font-inter`, `--font-mono`, plus `--font-heading` injecté par shadcn) et consommées directement dans `globals.css`/les classes utilitaires (`font-sans`, `font-mono`, etc.) :

- `font-display` (Fraunces) : réservé à la marque (logo, wordmark "vela"). Ne jamais l'utiliser dans l'interface produit elle-même.
- `font-sans` (Inter) : police par défaut de toute l'interface produit.
- `font-mono` (IBM Plex Mono) : réservé aux données factuelles (dates, identifiants, métadonnées), jamais au texte rédigé.

## Composants (`src/components/ui`)

Tous les composants sont générés par la CLI `shadcn` (basés sur `@base-ui/react` + `class-variance-authority`), à l'exception de `Logo` qui est spécifique à l'app :

- `Logo` (`Logo.tsx`, PascalCase — seul composant non-shadcn) : affiche le logo Vela (`public/vela-logo.png`), avec option `withWordmark` pour ajouter "vela" en Fraunces minuscule.
- `button.tsx` : variantes `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Tailles `default`, `xs`, `sm`, `lg`, `icon*`. Compact par défaut (h-7), sans largeur imposée — ajouter `w-full` pour un CTA pleine largeur.
- `card.tsx` : `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`. Le padding interne est géré via une variable CSS (`--card-spacing`, syntaxe fonction Tailwind v4 `px-(--card-spacing)`) — fonctionne nativement, pas besoin de repasser du padding explicite en `className` sauf pour ajuster ponctuellement une mise en page.
- `input.tsx`, `label.tsx` : à composer ensemble (`<Label htmlFor="x">` + `<Input id="x">`), pas de prop `label` intégrée.

Toute nouvelle interface doit composer avec ces éléments avant d'en créer de nouveaux. Ne pas dupliquer un composant déjà généré par shadcn — utiliser `npx shadcn add <composant>` pour en ajouter d'autres.

## Ajouter des composants shadcn

Le projet est sur **Tailwind CSS v4**, aligné avec la version ciblée nativement par la CLI `shadcn`. `npx shadcn@latest add <composant>` peut donc être utilisé directement, sans patch manuel :

1. Lancer `npx shadcn@latest add <composant>`.
2. Vérifier que le fichier généré atterrit bien dans `src/components/ui/` en minuscules (convention shadcn) et qu'il n'écrase pas silencieusement un composant existant portant un nom proche (attention : le système de fichiers macOS est insensible à la casse — `Card.tsx` et `card.tsx` désignent le même fichier).
3. Relancer `npm run build` pour confirmer qu'aucune régression n'est introduite.

## Principes d'interface (brand book §5)

- Beaucoup d'espace blanc ; la hiérarchie vient de la typographie, pas du remplissage.
- Pas d'animation décorative — seulement des transitions fonctionnelles (ouverture de dossier, sauvegarde).
- Aucune notification intrusive pendant une consultation.
- Rayons de bordure discrets (6–8px), jamais de formes trop arrondies façon app grand public.
- Un seul set d'icônes cohérent (type Phosphor ou Lucide), un seul poids de trait.

## Direction technique recommandée

Le brand book recommande de construire sur un design system open source (ShadCN/ui ou Radix + Tailwind) plutôt que tout recoder from scratch, et de ne personnaliser que via les tokens (couleurs, typographie, rayons, espacements). Éviter les composants custom sans raison fonctionnelle claire.
