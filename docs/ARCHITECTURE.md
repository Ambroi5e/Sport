# Architecture

Une seule application Next.js parle à Supabase. Le téléphone garde une file locale pour saisir hors ligne, et tout ce qui demande un secret reste sur le serveur. Chaque requête de données passe par la RLS de Postgres, même côté serveur : le serveur utilise la session de l'utilisateur, jamais la clé `service_role`, sauf dans les Edge Functions qui n'agissent pas au nom d'un utilisateur.

```text
Téléphone (PWA)                 Vercel (Next.js)                 Supabase (Paris)
  écrans et saisie   ──HTTPS──▶   Server Components   ──session──▶  Postgres + RLS
  service worker                  Server Actions + zod              Auth, Storage privé
  file locale Dexie               lib/engine (calculs)              Realtime
  worker pour gros imports        routes API, webhooks              Edge Functions
        └────────────── Realtime : séances communes ────────────────────┘
```

## Structure du dépôt

```text
app/(auth)/            connexion, inscription sur invitation, confirmation e-mail
app/(app)/             écrans connectés : accueil, entraînement, nutrition, courses, progrès
app/(app)/onboarding/  profil, objectif, disponibilités
app/admin/             codes d'invitation, compteurs (sans accès au contenu)
app/api/               webhooks, Raccourci iOS, OAuth Strava (plus tard)
components/            composants d'interface (boutons, champs, navigation)
lib/engine/            moteur de calcul pur, testé
lib/modules/           registre des modules activables par objectif
lib/supabase/          clients serveur et navigateur, types générés
lib/offline/           file Dexie et synchronisation idempotente (v0.3)
lib/providers/         interfaces AIProvider, ImportProvider
messages/              textes de l'interface (fr.json)
supabase/migrations/   migrations non destructives
supabase/pending-destructive/  drop, delete, revoke : à valider par Ambroise
supabase/tests/        tests RLS (Vitest + Postgres local)
supabase/functions/    Edge Functions
docs/  audit/  SPEC.md  CLAUDE.md  CHANGELOG.md
```

## Choix structurants

- **Rendu** : `cacheComponents` désactivé pour l'instant. Presque tous les écrans lisent la session ; le rendu dynamique classique est plus simple et suffit. À réévaluer quand les écrans seront stables.
- **Authentification** : `@supabase/ssr`, session dans des cookies, rafraîchie dans `proxy.ts` (le nouveau nom du Middleware dans Next 16). Chaque Server Action revérifie l'utilisateur ; la RLS reste la vraie barrière.
- **Inscription sur invitation** : un déclencheur sur `auth.users` refuse toute création de compte sans code d'invitation valide (code passé dans les métadonnées). Contourner l'interface et appeler l'API d'Auth directement ne suffit donc pas.
- **Connexion** : code à 6 chiffres reçu par e-mail, ou Google (bouton affiché seulement si le fournisseur est activé dans Supabase ; retour par `/auth/callback`). À l'inscription avec Google, l'invitation est réservée pour l'adresse saisie avant le départ vers Google, puis consommée par le déclencheur. Le code est indispensable sur iPhone : un lien ouvre Safari, pas l'app installée, et la session n'y serait pas.
- **Modules activables** : table `user_modules` et registre `lib/modules`. L'objectif choisi active un jeu de modules par défaut, modifiable ensuite.
- **Moteur pur** : fonctions déterministes, sans effet de bord, testées. Le plan prédictif et le planning seront des règles explicables (double progression, décharge toutes les 4 à 6 semaines, 48 à 72 h de récupération par muscle).
- **Hors ligne** : service worker écrit à la main (`public/sw.js`, sans Serwist tant qu'il reste simple) : fichiers statiques en cache, pages toujours demandées au réseau avec repli sur `/hors-ligne`, jamais de HTML personnel en cache ; à partir de la v0.3, chaque saisie reçoit un identifiant généré sur le téléphone, part dans une file Dexie et est envoyée au retour du réseau, sans doublon possible.
- **Temps réel** : Supabase Realtime seulement pour les séances communes, un canal privé par séance.
- **Gros imports** (Apple Santé, FIT, GPX) : lus dans un Web Worker sur le téléphone, seuls les résumés utiles partent au serveur.

## Schéma de données

Chaque table porte un `user_id`. Les catalogues communs (exercices, aliments de base) ont `user_id` vide : lisibles par les connectés, modifiables par personne depuis l'app.

| Domaine | Tables | Version |
| --- | --- | --- |
| Compte | `profiles`, `user_modules`, `goals` | v0.1 |
| Accès | `invitations`, `user_roles` | v0.1 |
| Corps | `body_weights` (v0.1), `body_measurements`, `progress_photos` | v0.1, v0.5 |
| Musculation | `exercises`, `exercise_muscles`, `workout_templates`, `template_items`, `workouts`, `workout_sets` | v0.2 |
| Nutrition | `foods`, `recipes`, `recipe_items`, `food_logs`, `nutrition_targets`, `tdee_estimates` | v0.4, v0.6 |
| Plan prédictif | `programs`, `program_goals`, `planned_sessions`, `planned_sets`, `exercise_preferences` | v0.6 |
| Activités | `activities`, `activity_segments`, `hr_zones`, `race_plans` | v0.8, v0.11 |
| Forme et bilans | `daily_checkins`, `weekly_reviews`, `review_adjustments` | v0.8, v0.10 |
| Amis | `friendships`, `share_grants`, `group_sessions`, `group_participants`, `group_events` | v0.9 |
| Courses | `food_prices`, `shopping_lists`, `shopping_items`, `stock_items`, `budgets` | v0.10 |
| Compléments | `supplements`, `supplement_logs` | v0.10 |
| Rappels | `push_subscriptions`, `reminder_settings` | v0.10 |
| Intégrations | `oauth_connections`, `personal_tokens`, `import_jobs` | v0.12 |

### Partage entre amis (v0.9)

`friendships` n'est `accepted` que si les deux ont accepté. `share_grants` liste ce que chacun montre, par catégorie (`performances`, `records`, `seances`, `poids`, `mensurations`, `photos`, `nutrition`, `forme`). Les politiques de lecture des tables partageables ajoutent `or public.can_view(user_id, '<catégorie>')`. Un ami ne peut jamais écrire chez un autre. Révoquer supprime la ligne : l'accès tombe à la requête suivante. Les données venues de Strava ne sont jamais partagées.

## Interfaces prévues

- `AIProvider` : désactivée par défaut (`FEATURE_AI=false`). Si elle est activée un jour : clé côté serveur uniquement, quota par personne, file d'attente, nom du modèle jamais affiché.
- `LabelReader` : lit une photo d'étiquette nutritionnelle et renvoie des valeurs pour 100 g à vérifier. Implémentation v0.6 : Tesseract.js dans un Web Worker, sur le téléphone, photo jamais envoyée au serveur. Implémentation future possible via `AIProvider`.
- `ImportProvider` : un format d'entrée (Strong, Hevy, CSV générique, GPX, FIT, Apple Santé) produit des lignes validées par zod.
