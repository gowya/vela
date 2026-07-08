# Coding Conventions

## TypeScript

- Le mode `strict` est activé dans `tsconfig.json` — ne jamais le désactiver localement (pas de `// @ts-ignore` sauf cas exceptionnel documenté).
- Utiliser l'alias `@/*` (configuré dans `tsconfig.json`) plutôt que des chemins relatifs profonds (`../../../lib/...`).
- Éviter `any` : privilégier `unknown` avec un narrowing explicite si le type n'est pas connu à l'avance.
- Valider toutes les entrées provenant de l'utilisateur ou d'une requête HTTP avec Zod (voir `src/app/api/signup/route.ts` comme référence).

## Composants React

- Préférer les composants fonctionnels (pas de classes).
- Composants serveur par défaut ; n'ajouter `"use client"` que lorsque l'interactivité (state, effets, event handlers) l'exige réellement (formulaires, boutons avec logique locale).
- Éviter les exports par défaut : utiliser des exports nommés (`export function Button(...)`, `export const Button = ...`) pour faciliter le renommage automatique et les imports explicites. Exception tolérée : les fichiers de convention Next.js qui l'imposent (`page.tsx`, `layout.tsx`).

## Style et UI

- Ne pas utiliser de valeurs de couleur arbitraires (`bg-[#f4f2ef]`) dans les composants applicatifs : utiliser les tokens sémantiques shadcn définis dans `src/app/globals.css` (`bg-primary`, `bg-background`, `text-muted-foreground`, etc.). Voir `ui_guidelines.md`.
- Pas de point d'exclamation, pas d'emoji, pas de ton publicitaire dans les textes affichés à l'utilisateur (cohérence avec l'identité verbale de la marque, voir `vela-brand-book.md`).
- Les messages d'erreur doivent expliquer ce qui s'est passé sans excès d'excuses ("La note n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez." plutôt que "Oups ! Une erreur est survenue 😅").

## Organisation du code

- Un composant UI réutilisable = un fichier sous `src/components/ui/`.
- La logique serveur (auth, accès DB) reste dans `src/lib/`, jamais dupliquée dans les composants ou routes API.
- Ne pas introduire de nouvelle dépendance (ex. librairie de composants, gestion d'état) sans vérifier qu'elle n'est pas déjà couverte par l'existant (ShadCN/Radix + Tailwind est la direction recommandée, voir `ui_guidelines.md`).
