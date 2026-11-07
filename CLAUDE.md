# Fonte : consignes du projet

Fonte est une application web (PWA) de suivi musculation, endurance, nutrition, courses et budget. Elle se partage entre amis aux objectifs différents sans jamais partager leurs données, sauf permission explicite. Le brief complet est résumé dans `SPEC.md` ; les décisions sont dans `docs/`.

## Langue et façon de travailler

- Tout en français : interface, documentation, messages de commit, échanges avec Ambroise.
- Expliquer ce qu'on fait et pourquoi, résultat d'abord.
- Une version = une branche, des commits atomiques par fonctionnalité, une PR. Chaque version commence par un plan dans `docs/plans/`.
- Plus petit changement qui règle le problème (pack ponytail). Pas de dépendance ajoutée sans raison écrite.
- Avant chaque version : revue de code, audit d'interface (impeccable + taste), captures Playwright à 375 px et 1440 px, `get_advisors` Supabase, puis feu vert d'Ambroise pour la production.
- Demander confirmation avant toute action payante, destructive, touchant la production ou envoyée hors du projet.
- Conseils santé toujours généraux, avec rappel de consulter un professionnel.
- Mettre à jour ce fichier, `SPEC.md`, `docs/` et `CHANGELOG.md` à chaque décision importante.

## Stack (décidée le 2026-11-06)

- Next.js 16 App Router + TypeScript strict, Server Components et Server Actions. Next 16 diffère des versions connues : lire `node_modules/next/dist/docs/` avant d'utiliser une API (Middleware s'appelle désormais `proxy.ts`).
- Tailwind CSS v4 (tokens dans `app/globals.css`), composants maison dans l'esprit shadcn/ui, icônes Phosphor, polices Archivo + Public Sans auto-hébergées via `next/font`.
- Supabase : Postgres + RLS sur toutes les tables, Auth par e-mail (code à 6 chiffres) et Google, toujours sur invitation, Storage privé, Realtime, Edge Functions. Projet `sport`, région Paris (eu-west-3).
- zod pour toute validation, react-hook-form pour les formulaires, next-intl (français seul jusqu'à v1.0).
- Moteur de calcul pur dans `lib/engine` : aucun import de React, Next ou Supabase. Testé avec Vitest.
- Qualité : oxlint, `tsc --noEmit`, Vitest, tests RLS sur Postgres local, Playwright (`--trace off`).
- Hébergement Vercel, CI GitHub Actions.
- Pas d'IA en v1 : interface `AIProvider` désactivée par défaut.

## Règles non négociables

- RLS activée sur chaque table du schéma `public`, quatre politiques limitées à `user_id = (select auth.uid())`, plus `can_view(owner, catégorie)` pour le partage entre amis. Toute nouvelle table arrive avec ses tests RLS.
- La clé `service_role` ne sort jamais du serveur ; aucun secret dans le dépôt (`.env.example` documenté, gitleaks en CI).
- Migrations dans `supabase/migrations/` : les non destructives sont appliquées par Claude ; tout `drop`, `delete`, `revoke` ou `truncate` va dans `supabase/pending-destructive/` et attend la validation d'Ambroise.
- Les données personnelles d'Ambroise (seed) restent hors du dépôt (`supabase/seed/personal*.sql` est ignoré).
- Mobile pensé à part : barre d'onglets en bas (Accueil, Entraînement, Nutrition, Courses, Progrès), bouton + flottant, saisie en 2 ou 3 taps. Ordinateur : sidebar. Flèche retour sur chaque écran qui n'est pas un onglet racine.
- Contraste AA minimum, mode sombre par défaut, mode clair disponible. Trois styles au choix dans Réglages (Fonte par défaut, Couloir, Carnet) : tout passe par les tokens de `app/globals.css`, jamais de couleur, police ou rayon codés en dur.

## Commandes

```bash
npm run dev          # serveur local
npm run lint         # oxlint
npm run typecheck    # tsc --noEmit
npm test             # Vitest (moteur + RLS si DATABASE_URL_TEST est défini)
npm run test:e2e     # Playwright, --trace off
npm run build
```

## Périmètre retiré

- Mini-lecteur de musique (Spotify, Apple Music, Deezer) : retiré le 2026-11-06, trop compliqué pour le gain.
- Strava : option tardive (v0.12), import GPX/FIT en voie principale ; données Strava jamais montrées aux amis.
