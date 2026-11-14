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
lib/offline/           file d'attente des saisies (localStorage) et copie de la séance en cours (v0.3)
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
- **Hors ligne** : service worker écrit à la main (`public/sw.js`, sans Serwist tant qu'il reste simple) : fichiers statiques en cache, pages toujours demandées au réseau avec repli sur `/hors-ligne`. Une seule page personnelle gardée : la séance en cours (voir « Séance en direct »). Chaque saisie reçoit un identifiant généré sur le téléphone, passe par une file d'attente et est envoyée dès que possible, sans doublon possible.
- **Temps réel** : Supabase Realtime seulement pour les séances communes (changements Postgres de `group_events` et `group_participants`, filtrés par la RLS), avec un rechargement toutes les 15 secondes en filet de sécurité.
- **Gros imports** (Apple Santé, FIT, GPX) : lus dans un Web Worker sur le téléphone, seuls les résumés utiles partent au serveur.

## Schéma de données

Chaque table porte un `user_id`. Les catalogues communs (exercices, aliments de base) ont `user_id` vide : lisibles par les connectés, modifiables par personne depuis l'app.

| Domaine | Tables | Version |
| --- | --- | --- |
| Compte | `profiles`, `user_modules`, `goals` | v0.1 |
| Accès | `invitations`, `user_roles` | v0.1 |
| Corps | `body_weights` (v0.1), `body_measurements`, `progress_photos` | v0.1, v0.5 |
| Musculation | `exercises` (muscles en tableaux sur l'exercice), `workout_templates`, `template_items`, `workouts`, `workout_sets` (une série prévue n'a pas encore de `completed_at`) | v0.2 |
| Nutrition | `foods`, `food_logs`, `nutrition_targets`, `saved_meals`, `saved_meal_items` (v0.4), `foods.is_recipe` et `recipe_items` (v0.6.1) : une recette est un aliment, la dépense réelle se calcule à la lecture (pas de table `tdee_estimates`) | v0.4, v0.6.1 |
| Plan prédictif | `programs` (réglages et objectif chiffré), `exercise_preferences`, `workout_templates.program_id` : les séances du programme sont des modèles, les charges prévues se calculent à la lecture | v0.6 |
| Planning | `weekly_sports` (sports fixes de la semaine type), `session_pins` (séance déplacée à la main, pour une semaine), `blocked_days` (jour libéré), `workouts.is_light` ; le planning lui-même se calcule à la lecture | v0.8.1 |
| Activités | `activities` (v0.8 : sports additionnels ; colonnes d'endurance en v0.11), `activity_segments`, `hr_zones`, `race_plans` | v0.8, v0.11 |
| Forme et bilans | `daily_checkins` (v0.8), `weekly_reviews` (v0.10.2) | v0.8, v0.10.2 |
| Amis | `friendships`, `friend_invites`, `share_grants` (v0.9) ; `group_sessions`, `group_participants`, `group_events` (v0.9.1) | v0.9, v0.9.1 |
| Courses | `shopping_items`, `food_prices`, `purchases`, `profiles.weekly_food_budget` (v0.10) ; `stock_items` (v0.10.1) | v0.10, v0.10.1 |
| Compléments | `supplements`, `supplement_logs` | v0.10.1 |
| Rappels | `push_subscriptions`, `reminder_settings` | v0.10.3 |
| Intégrations | `oauth_connections`, `personal_tokens`, `import_jobs` | v0.12 |

### Partage entre amis (v0.9)

- `friendships` : une ligne par paire (plus petit identifiant en premier), créée quand l'un saisit le code d'ami de l'autre (`friend_invites`, code haché, usage unique, 7 jours). Pas d'annuaire ni de demande en attente : donner son code vaut accord.
- `share_grants` liste ce que chacun montre à chaque ami, par catégorie (`seances`, `records`, `poids`, `mensurations`, `nutrition`, `forme`). Pas de ligne, rien de montré. Les photos ne se partagent pas.
- **Les politiques des tables de données ne changent pas.** Un ami lit par des fonctions `friend_*` qui vérifient `public.can_view(propriétaire, catégorie)` et renvoient un résumé (`app/(app)/amis/data.ts` n'appelle que les catégories ouvertes). Choix fait contre des politiques de lecture élargies : aucune requête existante ne peut se mettre à mêler les lignes d'un ami aux siennes, et ce qui est partagé est écrit colonne par colonne.
- Un ami ne peut jamais écrire chez un autre. Révoquer supprime la ligne : l'accès tombe à la requête suivante. Retirer un ami efface les permissions des deux côtés.
- Écrans : `/amis` (liste, créer un code, saisir un code), `/amis/[id]` (ce qu'il montre, ce qu'on lui montre, retirer). Les charges d'un ami s'affichent dans l'unité de celui qui regarde.
- Les données venues de Strava ne seront jamais partagées.

### Séances communes (v0.9.1)

- Une séance commune est un tableau partagé par-dessus les séances de chacun : `group_sessions` (qui l'a lancée, nom, fin), `group_participants` (invité, puis présent quand `joined_at` est rempli), `group_events` (une ligne par série terminée).
- **Le fil s'écrit en base** : un déclencheur sur `workout_sets` copie la série dans `group_events` quand elle passe à « faite » et que la personne est présente dans une séance commune en cours (pas terminée, lancée depuis moins de six heures). La saisie des séries et sa file hors ligne ne changent pas ; une série renvoyée deux fois ne donne qu'un événement (`unique (session_id, set_id)`).
- `groupBoard` et `groupFeed` (`lib/engine/group.ts`) résument le fil par participant ; `getGroupSession` (`app/(app)/amis/seance/data.ts`) les calcule à chaque rendu.
- `LiveRefresh` (`components/friends/live-refresh.tsx`) écoute Realtime et demande au serveur de redessiner (`router.refresh()`) ; il recharge aussi toutes les 15 secondes tant que l'écran est visible. Aucune donnée ne transite par le client navigateur : il ne fait que signaler qu'il y a du nouveau.
- Écrans : `/amis/seance/nouvelle`, `/amis/seance/[id]`, et un bandeau dans Amis et Entraînement.

### Courses et budget (v0.10)

- Une seule liste par personne (`shopping_items`) : nom, quantité en clair, rayon, coché ou non. Un article venu des repas garde `food_id` et `grams`, ce qui permet d'estimer son coût ; un article écrit à la main n'a ni l'un ni l'autre.
- `lib/engine/groceries.ts` : `guessAisle` (mots-clés, début de mot), `ingredientsEaten` (recettes dépliées au prorata), `purchaseGrams` (arrondi au-dessus : 50 g, 100 g, 250 g), `listCost`, `budgetStatus` (semaine du lundi, moyenne des semaines précédentes notées), `dayCost` (jamais extrapolé, pas de chiffre sous 50 % de calories couvertes).
- « Depuis mes repas » recalcule les quantités côté serveur à l'envoi (`addFromMeals`) : le formulaire n'envoie que les aliments cochés.
- Prix au kilo (`food_prices`) et achats (`purchases`) sont saisis à la main ; euros seulement. Le budget est une colonne du profil, vide par défaut.
- Écrans : `/courses`, `/courses/article/[id]`, `/courses/repas`, `/courses/budget`, `/courses/prix`.

### Stock et compléments (v0.10.1)

- `stock_items` reprend la forme d'un article de la liste (nom, quantité en clair, rayon, aliment et poids quand ils sont connus) et ajoute `expires_on`. `storeChecked` copie les articles cochés dans le stock puis les retire de la liste, dans cet ordre : une panne entre les deux laisse un doublon, jamais une perte.
- `lib/engine/stock.ts` : `expiryOf` (périmé, à finir à 3 jours ou moins, sinon tranquille), `sortStock`, `stockByFood` (grammes non périmés par aliment), `missingGrams`. `mealNeeds` déduit le stock avant l'arrondi d'achat. Le stock n'est pas décompté à chaque repas noté : il se tient à la main.
- Compléments : `supplements` (nom, dose en clair, moment, pause) et `supplement_logs` (une ligne par complément et par jour). `adherence` (`lib/engine/supplements.ts`) ne compte pas les jours d'avant l'ajout. Aucun catalogue : rien n'est proposé.
- Écrans : `/courses/stock`, `/courses/stock/[id]`, `/nutrition/complements`, `/nutrition/complements/nouveau`, `/nutrition/complements/[id]`.

### Bilan du dimanche (v0.10.2)

- `weekReview` (`lib/engine/review.ts`) calcule une semaine du lundi au dimanche à partir des séances, sports, séries, journal, cibles, pesées, check-ins et achats. Une rubrique sans assez de données reste à `null` : quatre jours notés au moins pour la nutrition, deux pesées pour le poids.
- `reviewLines` (`lib/review.ts`) met chaque rubrique en mots, avec un ton écrit (« Bien », « À regarder ») que la couleur ne fait que doubler.
- `reviewWeek` choisit la semaine montrée d'office : celle en cours le dimanche, sinon la précédente.
- Seuls le ressenti (1 à 5) et la note sont stockés (`weekly_reviews`, une ligne par semaine). `review_adjustments`, prévue au cadrage, n'existe pas : l'ajustement des calories reste l'alerte de rythme (`paceAlert`), appliquée à la main dans Cibles.
- Écran : `/progres/bilan` (`?semaine=AAAA-MM-JJ` pour une autre semaine).

## Interfaces prévues

- `AIProvider` : désactivée par défaut (`FEATURE_AI=false`). Si elle est activée un jour : clé côté serveur uniquement, quota par personne, file d'attente, nom du modèle jamais affiché.
- `LabelReader` : lit une photo d'étiquette nutritionnelle et renvoie des valeurs pour 100 g à vérifier. Implémentation v0.6.2 : Tesseract.js dans un Web Worker, sur le téléphone, photo jamais envoyée au serveur (`components/nutrition/label-reader.tsx`, `parseNutritionLabel`). Implémentation future possible via `AIProvider`.
- `ImportProvider` : un format d'entrée (Strong, Hevy, CSV générique, GPX, FIT, Apple Santé) produit des lignes validées par zod.

## Musculation (v0.2)

- **Muscles** : `primary_muscles` et `secondary_muscles` sont des tableaux sur `exercises`, au lieu d'une table de liaison. Le calcul du volume par muscle reste dans le moteur.
- **Séries prévues** : démarrer depuis un modèle crée les séries à l'avance, sans `completed_at`. Valider une série la complète ; terminer la séance retire les séries non validées.
- **Enregistrement idempotent** : chaque série reçoit son identifiant dans le navigateur et s'enregistre par upsert. La file d'attente de la v0.3 s'appuie dessus : renvoyer une série ne crée pas de doublon, et la série garde l'heure de validation du téléphone.
- **Records** : calculés à la volée par `lib/engine/training.ts` à partir des séries, sans table. Le record battu s'affiche dès la validation, comparé aux records d'avant la séance.
- **Cohérence** : clés étrangères composites `(workout_id, user_id)` et `(template_id, user_id)`, et `exercise_is_usable()` dans les politiques : impossible d'écrire dans la séance d'un autre ou d'utiliser son exercice personnel.

## Séance en direct (v0.3)

- **File d'attente** (`lib/offline/outbox.ts`) : toute saisie de séance est d'abord écrite dans `localStorage`, l'écran se met à jour, puis les opérations partent une par une, dans l'ordre, par les Server Actions habituelles. Deux opérations sur la même série se remplacent. Nouvel essai au retour du réseau, au retour dans l'app et après un délai croissant (2 s à 1 min). Une réponse `retry: false` (valeur hors limites, contrainte, RLS) retire l'opération et affiche l'erreur sur la série. La logique de fusion est pure et testée (`lib/engine/outbox.ts`).
- **Pourquoi pas Dexie** : quelques dizaines de petites opérations au plus ; `localStorage` est synchrone, survit à la fermeture de l'app et n'ajoute pas de dépendance. IndexedDB reviendra pour des photos ou de gros volumes.
- **Opérations par compte** : chaque opération porte l'identifiant de son auteur et ne part qu'avec sa session. Une session expirée garde la file et propose de se reconnecter.
- **Rouvrir sans réseau** : la page de séance demande au service worker de garder sa copie (à l'ouverture et chaque fois que la file se vide), avec les scripts qu'elle référence. Rouverte hors ligne, elle réapplique les opérations encore en file. Ajouter un exercice et terminer la séance demandent du réseau et le disent.
- **Chrono de repos** (`components/training/rest-timer.tsx`) : heure de fin gardée dans `localStorage`, visible sur toutes les pages connectées, durée retenue par exercice. Fin signalée par vibration (Android), son court en mode « ambiant » et annonce pour les lecteurs d'écran.
- **Écran allumé** : `Screen Wake Lock` pendant une séance en cours, repris au retour dans l'app.
- **Réglages de séance** (`lib/session-prefs.ts`) : repos par défaut, son, écran allumé, gardés sur l'appareil.

## Nutrition rapide (v0.4)

- **Aliments pour 100 g** : `foods` porte les valeurs pour 100 g et une portion nommée facultative. Catalogue commun de 88 aliments (`user_id` vide, valeurs moyennes Ciqual et USDA arrondies), aliments personnels pour le reste. Un aliment personnel s'archive au lieu de se supprimer : il reste dans les jours où il a été noté.
- **Journal sans copie** : `food_logs` garde l'aliment, le jour, le repas et les grammes. Les apports se calculent à la lecture (`nutrientsFor` du moteur). Corriger un aliment personnel corrige donc aussi les jours passés.
- **Ajout en un tap** : l'écran d'ajout propose d'abord les repas favoris (`saved_meals`, `saved_meal_items`) et les aliments les plus notés sur 30 jours avec leur dernière quantité (`frequentFoods`). La recherche se fait dans le navigateur, sans accents (`lib/text.ts`), sur la liste des aliments chargée une fois.
- **Repas proposé** : selon l'heure locale du profil (avant 10 h 30, 15 h, 18 h 30, ensuite), corrigeable d'un tap.
- **Type de jour** : entraînement si le jour fait partie de `profiles.training_days` (1 = lundi) ou si une séance y est enregistrée, repos sinon. Chaque type a sa cible (`nutrition_targets`, clé `(user_id, day_type)`, enregistrée par upsert).
- **Cible suggérée** (`suggestTargets`) : Mifflin-St Jeor × activité selon les séances, ajustée à l'objectif (+10 % prise de masse, −20 % sèche), ±5 % selon le type de jour, protéines à 2 g/kg (musculation, force) ou 1,6 g/kg. Affichée comme repère, recopiée seulement sur demande, avec le rappel de consulter un professionnel.
- **Cohérence** : `food_is_usable()` dans les politiques de `food_logs` et `saved_meal_items`, clé composite `(saved_meal_id, user_id)` : impossible de noter l'aliment personnel d'un autre ou de remplir son favori.
- **Pas de saisie hors ligne** pour les repas en v0.4 : les actions passent par le réseau. La file d'attente de la v0.3 pourra les accueillir.

## Corps et progrès (v0.5)

- **Courbes en SVG maison** (`components/charts/`) : courbe (pesées en pastilles, moyenne en trait) et colonnes, rendues côté serveur. Rien n'est envoyé au téléphone, pas de bibliothèque. Le tracé est en SVG étiré (`vector-effect: non-scaling-stroke`), les pastilles et les textes en HTML positionné : ils gardent leur taille à toutes les largeurs. Graduations rondes et axe des dates dans `lib/charts.ts`. Chaque courbe a un résumé écrit et son tableau de valeurs (« Voir les valeurs »), le tracé lui-même est masqué aux lecteurs d'écran. Couleur `--chart` : l'accent, foncé en clair pour Fonte et Carnet (3:1 au moins sur la carte).
- **Moteur** (`lib/engine/body.ts`) : série de la courbe du poids et moyenne sur 7 jours jour par jour, moyennes de trois semaines glissantes, alerte de rythme, écarts de mensurations, volume du lundi au dimanche, meilleur 1RM estimé par séance, semaine en cours.
- **Alerte de rythme** : elle compare les moyennes de trois semaines glissantes de 7 jours (deux pesées au moins par semaine). Si les deux variations sortent de la fourchette de l'objectif dans le même sens, elle propose −200 kcal (au-dessus) ou +200 kcal (en dessous). Suggestion seulement : la cible ne change que si l'utilisateur la modifie.
- **Mensurations** : `body_measurements`, une valeur par zone et par jour (clé `(user_id, measured_on, site)`, enregistrée par upsert). Saisie de plusieurs zones d'un coup ; vider une zone déjà saisie ce jour-là la supprime.
- **Photos** : bucket privé `progress-photos` (JPEG seulement, 1 Mo au plus), un dossier par utilisateur, fichiers `<user_id>/<id>.jpg`. La contrainte `storage_path = user_id || '/' || id || '.jpg'` empêche une ligne de pointer vers le dossier d'un autre ; les politiques de `storage.objects` limitent lecture, dépôt et suppression au premier dossier du chemin. La photo est réduite à 1 600 px et réencodée en JPEG sur le téléphone (canevas, sans EXIF ni GPS), puis envoyée par une Server Action qui revérifie type, taille et signature JPEG. Affichage par liens signés de 10 minutes générés côté serveur, sans `next/image` (l'optimiseur garderait une copie hors du bucket). Suppression : le fichier d'abord, puis la ligne. Comparaison côte à côte de deux dates pour une même pose.
- **Force** : volume des 8 dernières semaines et 1RM estimé des quatre exercices les plus suivis sur 12 semaines, calculés à la lecture des séries. Les séries sont lues par pages de 1 000 lignes (limite par requête de l'API).
- **Tableau de bord** : pesée et alerte, semaine en cours (séances faites face à `sessions_per_week`, jours habituels de `training_days`), objectif et compte à rebours, nutrition du jour, et pour la musculation et la force le volume des 8 dernières semaines.
- **Vues séparées** : chaque page de Progrès lit ses données puis rend une vue (`components/progress/*-view.tsx`), que l'aperçu de développement réutilise avec des données d'exemple.

## Plan prédictif (v0.6)

- **Un programme = des modèles** : générer un programme crée une ligne `programs` (séances par semaine, durée, matériel, muscles prioritaires, objectif chiffré facultatif) et un modèle par séance (`workout_templates.program_id`, clé étrangère composite `(program_id, user_id)` pour ne jamais rattacher un modèle au programme d'un autre). Démarrer, modifier, réordonner se fait avec les écrans des modèles. Un seul programme en cours par personne (index unique partiel sur `ended_on is null`). Terminer un programme garde ses modèles, sans charge suggérée.
- **Rien de prévu n'est stocké** : pas de tables `planned_sessions` ni `planned_sets`. La charge du jour se calcule à la lecture depuis l'historique, ce qui recalcule le plan après chaque séance. La prochaine séance est celle qui suit la dernière séance du programme terminée : une séance ratée ne bloque rien.
- **Génération** (`lib/engine/program.ts`, `buildProgram`) : répartition selon le nombre de séances (2 : full body ; 3 : haut/bas/haut si les priorités sont en haut, bas/haut/bas si elles sont aux jambes, sinon full body ; 4 : haut/bas ; 5 : haut, bas, push, pull, jambes ; 6 : push/pull/jambes ×2), environ 3 minutes par série. Pour chaque place de la séance, une note explicable : gros polyarticulaires en tête (plutôt à la barre), exercices guidés ensuite, isolation pour les petits muscles, puis les habitudes (séances des 6 derniers mois). Ceux qu'on aime et l'exercice de l'objectif passent devant, ceux à éviter sont écartés ; un exercice déjà pris dans la semaine perd des points, ce qui varie les séances A et B. Les muscles prioritaires prennent une place de plus, plus tôt dans la séance, et les séries restantes. Mêmes réglages, même programme.
- **Charge suggérée** (`suggestNext`, `suggestSets`) : double progression. Quand toutes les séries à la charge la plus lourde ont atteint le haut de la fourchette, la charge monte d'un pas (5 kg à la barre pour les jambes, 2 kg aux haltères, 4 kg au kettlebell, 2,5 kg sinon) et les reps repartent du bas ; sinon même charge, une rep de plus par série. Semaine de décharge (toutes les 5 semaines par défaut) : 60 % des séries, charge −10 %. La séance de référence est la dernière hors semaines de décharge (`lastSession`) : après une décharge, on repart des charges d'avant. Au démarrage d'une séance du programme, les séries sont préremplies avec la suggestion ; en séance, une phrase sous l'exercice dit ce qui est proposé et pourquoi. Les pas sont en kg : en livres, la charge affichée n'est pas arrondie aux disques.
- **Projection** (`projectE1RM`) : 1RM estimé de l'exercice objectif (meilleure séance des 14 derniers jours), pente des 6 dernières semaines quand il y a au moins 3 séances sur 14 jours et qu'elle monte (plafonnée à 3 % par semaine), sinon repère selon le niveau (1,5 %, 0,75 % ou 0,35 % par semaine). À plat les semaines de décharge. Date estimée d'atteinte, comparée à la date visée. Courbe : séances réelles en pastilles, projection en pointillés, objectif en repère horizontal.
- **Préférences** : `exercise_preferences` (j'aime, à éviter), une par exercice, réglée depuis la fiche exercice ou en remplaçant un exercice (« Ne plus me proposer »). Le remplacement propose les exercices des mêmes muscles principaux et du même type de mesure, avec le matériel du programme, ceux qu'on aime en premier.
- **Volume prévu** : séries par muscle et par semaine hors décharge (1 par muscle principal, 0,5 par secondaire), face au repère de 10 à 20 séries.

## Dépense réelle et recettes (v0.6.1)

- **Dépense réelle calculée à la lecture** (`lib/engine/adaptive.ts`, `adaptiveTdee`) : sur les 28 jours complets avant aujourd'hui, apports moyens des jours qui comptent moins la pente des pesées (moindres carrés, en kg par jour) × 7 700 kcal. Un jour compte s'il est noté à 60 % au moins de la médiane des jours notés : en dessous, c'est sans doute un oubli. Il faut 14 jours qui comptent et 4 pesées étalées sur 14 jours ; le résultat est borné entre 1 200 et 6 000 kcal. Rien n'est stocké : le journal et les pesées suffisent, et une correction du journal se répercute aussitôt.
- **Page Cibles** : la carte « Ta dépense réelle » montre la mesure, son explication (apports moyens, variation du poids) et l'écart avec la formule de Mifflin-St Jeor, avec une mise en garde au-delà de 25 % (souvent un journal incomplet). Sans assez de données, elle dit ce qui manque et où l'on en est. Quand la mesure est fiable, le repère suggéré part d'elle (`suggestTargets` avec `maintenanceKcal`) ; il ne s'applique que sur un tap, avec le rappel de consulter un professionnel.
- **Une recette est un aliment** : une ligne `foods` avec `is_recipe`, son poids cuit facultatif (`recipe_total_g`) et son nombre de parts (`recipe_portions`). Ses valeurs pour 100 g sont calculées depuis `recipe_items` (`recipeNutrients`, `lib/recipes.ts`) et enregistrées dans les colonnes habituelles ; la part devient la portion (« 1 part »). Elle se note donc comme n'importe quel aliment : recherche, part ou poids dans l'assiette, favoris, « comme hier ».
- **Calcul refait côté serveur** : l'éditeur affiche les totaux en direct, mais `saveRecipe` relit les ingrédients en base et recalcule. Il refuse une recette dont 100 g dépasseraient 900 kcal ou 100 g de macros (pesée du plat cuit erronée) et une part de plus de 2 kg. Modifier une recette insère les nouveaux ingrédients avant de retirer les anciens : un échec en route ne la vide jamais.
- **Pas de recette dans une recette** : les ingrédients sont des aliments simples, ce qui évite les boucles. Corriger un aliment personnel recalcule les recettes qui l'utilisent ; comme les apports du journal se calculent à la lecture, les jours passés suivent.
- **Cohérence** : clé composite `(recipe_id, user_id)` vers `foods (id, user_id)` (une ligne ne peut viser la recette d'un autre), `food_is_usable()` sur l'ingrédient, une recette n'est jamais son propre ingrédient, et le catalogue commun n'a pas de recette.

## Code-barres et photo d'étiquette (v0.6.2)

- **Ordre de recherche** (`/nutrition/code/[code]`) : un aliment non archivé portant ce code (le sien d'abord, sinon le catalogue) passe directement à la quantité ; sinon Open Food Facts ; si la fiche manque ou est incomplète, la photo de l'étiquette. Le code-barres reste sur l'aliment créé (`foods.barcode`, index unique `(user_id, barcode)` sur les aliments actifs) : le scan suivant le retrouve.
- **Scan en direct** (`components/nutrition/barcode-scanner.tsx`) : caméra arrière par `getUserMedia`, lecture toutes les 120 ms. `BarcodeDetector` du navigateur s'il lit les EAN-13, EAN-8 et UPC-A (Chrome sur Android), sinon la bibliothèque `barcode-detector` (même API, lecteur zxing en WebAssembly, chargée à la demande, `.wasm` servi par Fonte). Un code n'est retenu que si sa clé de contrôle est juste (`isValidBarcode`). Caméra refusée ou absente : les chiffres se tapent.
- **Open Food Facts côté serveur** (`app/(app)/nutrition/scan.ts`) : l'API v2 ne reçoit que le code-barres et les champs utiles, avec un `User-Agent` au nom de Fonte, 5 s au plus, réponse gardée un jour en cache. `fromOpenFoodFacts` (`lib/openfoodfacts.ts`) reprend le nom (français d'abord), la première marque, les valeurs pour 100 g (kcal, ou kJ ÷ 4,184) et la portion, écarte les valeurs impossibles et dit si la fiche est complète. Lien vers la fiche, sous licence ODbL.
- **Photo d'étiquette** : photo par le champ fichier (`capture="environment"`, appareil photo natif), réduite à 1 800 px, lue par Tesseract.js (français, `oem` LSTM, page en bloc unique) dans un Web Worker. `parseNutritionLabel` (moteur) prend le premier nombre après chaque libellé (la colonne « pour 100 g » vient en premier), ignore les lignes « dont » sauf les sucres, corrige les fautes courantes (O lu pour 0, « g » collé lu comme un 9) et déduit les calories des macros si elles manquent. La photo reste dans le navigateur le temps de comparer, puis disparaît.
- **Vérification obligatoire** : les valeurs trouvées préremplissent le formulaire d'aliment (`FoodForm`, prop `prefill`), rien n'est enregistré sans un tap.
- **Fichiers servis par Fonte** : `scripts/copy-scan-assets.mjs` copie avant `dev` et `build` le lecteur zxing, le worker et le moteur de Tesseract (trois variantes selon le WebAssembly du téléphone) et les données de langue françaises dans `public/scan/` (non versionné, environ 13 Mo dont un seul moteur est téléchargé). Aucun CDN tiers à l'exécution. Ces fichiers sortent du proxy : statiques, sans donnée personnelle, et le worker tourne sans la CSP de la page.

## Confidentialité, export et suppression du compte (v0.7)

- **Page Confidentialité** (`/confidentialite`, publique, liée depuis la connexion, l'inscription et Réglages) : ce que Fonte garde, où (Supabase et Vercel à Paris), qui peut techniquement le lire (l'administrateur du projet Supabase), ce qui sort (le code-barres vers Open Food Facts), les cookies, la durée, les droits. Elle doit rester vraie : toute nouvelle donnée ou tout nouveau service la met à jour.
- **Export lu au nom de la personne** (`app/(app)/reglages/donnees/data.ts`) : chaque table de `EXPORT_TABLES` (`lib/export/tables.ts`) est lue sous RLS avec un filtre `user_id` explicite (le partage entre amis rendra visibles des lignes d'amis), page par page de 1 000 lignes avec un tri unique. Les exercices et aliments du catalogue utilisés sont nommés dans `catalog`. Hors export : les invitations (codes hachés, adresses d'autres personnes). Deux routes GET sans cache : `/reglages/donnees/export` (le JSON, en pièce jointe) et `/reglages/donnees/photos` (liens signés de 10 minutes).
- **Archive construite sur le téléphone** (`components/settings/export-button.tsx`) : JSON, puis photos téléchargées 4 par 4 directement depuis Storage (elles ne transitent pas par Vercel, sans limite de taille de réponse), puis `archiveEntries` (`lib/export/archive.ts`) et `createZip` (`lib/export/zip.ts`, zip « stored » écrit à la main, CRC-32, noms UTF-8). Une photo qui échoue est comptée et signalée, l'archive part quand même.
- **CSV** (`lib/export/csv.ts`) : `;`, virgule décimale, BOM UTF-8, CRLF, un fichier par table non vide, sans `user_id`, chaque identifiant d'exercice, d'aliment ou de séance suivi de son libellé. Un texte qui commence par `=`, `+`, `-` ou `@` est préfixé d'une apostrophe (pas de formule venue d'un nom de produit).
- **Suppression du compte** (`deleteAccount`, `public.delete_my_account()`) : confirmation tapée (« SUPPRIMER »), effacement du dossier de photos par l'API Storage au nom de la personne, puis la fonction SQL (`security definer`) supprime la ligne `auth.users` ; tout `public` suit par `on delete cascade`, les invitations gardent leur trace (`set null`). La fonction refuse sans session et tant qu'un fichier reste dans le dossier : jamais de photo orpheline. Aucune clé `service_role`. Ensuite : cookies de session retirés, données de l'appareil effacées comme à la déconnexion, page `/compte-supprime`.
- **SMTP** : réglage du tableau de bord Supabase, guide dans `docs/SELF-HOSTING.md`.

## Sports additionnels et forme du jour (v0.8)

- **Une table pour les activités** : `activities` garde le jour, le sport (`activity_sport` : padel, tennis, squash, badminton, foot, basket, handball, rugby, volley, escalade, combat, autre), la durée et l'intensité (`activity_intensity` : légère, modérée, intense). Le nom libre (`label`) n'existe que pour « autre », et « autre » en a toujours un (contrainte). L'endurance de la v0.11 ajoutera ses colonnes et ses sports à cette table.
- **Dépense calculée à la lecture** (`lib/engine/activity.ts`) : MET × kg × heures, arrondi à 5 kcal. Une valeur de MET par sport et par intensité, tirée du Compendium des activités physiques 2024 (codes en commentaire ; « milieu » quand le Compendium ne donne que loisir et compétition ; le padel, absent du Compendium, prend le tennis en double et le paddleball). Le poids est la dernière pesée au plus tard ce jour-là, sinon la première d'après (`weightOn`) ; sans pesée, aucune dépense n'est affichée. C'est une dépense brute, montrée comme un ordre de grandeur : elle ne touche pas aux cibles, déjà ajustées par la dépense réelle (v0.6.1).
- **Saisie** (`/entrainement/sports/ajouter`) : la carte « Comme la dernière fois » refait la dernière activité aujourd'hui en un tap ; le formulaire en dessous est prérempli avec elle, les sports déjà pratiqués en premier. La dépense estimée et son calcul se mettent à jour à chaque choix.
- **Place dans le reste de l'app** : un jour avec une activité est un jour d'entraînement pour les cibles (`getDayType`). La semaine de l'accueil (`currentWeek`) compte les activités à part (`sports`), sans les mêler aux séances comparées aux séances prévues.
- **Forme du jour** : `daily_checkins`, clé `(user_id, checkin_on)`, enregistrée par upsert (refaire le check-in le corrige). Quatre notes de 1 à 5 dans leur sens naturel (sommeil et énergie : 5 = très bien ; courbatures et stress : 5 = forts), lisibles telles quelles dans l'export.
- **Note de forme** (`lib/engine/readiness.ts`) : moyenne du sommeil, de l'énergie, de 6 − courbatures et de 6 − stress, à 0,1 près. Basse sous 2,5, ou avec un sommeil à 1 ou des courbatures à 5 ; bonne à 3,5 et plus sans aucune note à son pire ; moyenne sinon. `factors` liste ce qui tire vers le bas (sommeil ou énergie à 2 ou moins, courbatures ou stress à 4 ou plus) pour l'expliquer. Le conseil du jour reste général ; les actions (alléger, décaler, remplacer une séance) sont dans le planning (v0.8.1).
- **Courbe de forme** (Progrès > Forme) : la note de chaque check-in et sa moyenne sur 7 jours (même calcul que la moyenne du poids), axe fixe de 1 à 5 (`domain` du composant `LineChart`) et seuil de bonne forme en repère ; moyenne de chaque critère sur 7 jours face aux 7 jours d'avant (« stable » sous 0,3 point d'écart).

## Planning intelligent (v0.8.1)

- **Calculé à la lecture** (`lib/engine/planning.ts`, pur) : `getWeekContext` (`app/(app)/entrainement/semaine/data.ts`) lit 28 jours de séances et de sports, la semaine type, les déplacements et la forme du jour, et tout le reste en découle. Le même historique donne le même planning.
- **Placement** (`placeWeek`) : les séances restantes du programme, dans l'ordre, sur les jours disponibles d'aujourd'hui à dimanche. Recherche exhaustive (au plus sept jours), coût comparé dans l'ordre : conflits de récupération, ordre du programme, séances collées, puis le plus tôt. Un conflit est une séance ou un sport modéré ou intense sur les mêmes gros muscles à moins de 48 h (`SPORT_MUSCLES`, `QUICK_RECOVERY` pour les muscles qui ne comptent pas). Une séance qui ne peut pas l'éviter est placée avec son avertissement.
- **Séance ratée** (`planWeek`) : le planning recalculé comme lundi matin dit ce qui était prévu les jours passés ; ce qui n'a pas été fait est marqué `missed` et replacé par le placement courant.
- **À la main** : `session_pins` fixe une séance sur un jour de sa semaine (`moveOptions` décrit chaque jour possible) ; `blocked_days` retire un jour. « Décaler » bloque aujourd'hui, « Remplacer » épingle l'autre séance à aujourd'hui : deux écritures simples, le reste se replace seul.
- **Charge** (`trainingLoad`) : minutes × effort (sport 3, 5 ou 7 selon l'intensité, musculation 6) sur 7 jours, face à la moyenne hebdomadaire sur 28 jours ; pas de rapport avant 21 jours d'historique.
- **Adaptation** (`adaptSession`, `todayOptions`) : d'après le niveau de forme, les courbatures et le rapport de charge, une action conseillée parmi normal, alléger, décaler, remplacer ; les autres restent proposées. Les textes sont dans `lib/planning.ts`.
- **Séance allégée** : `startWorkout` avec `light` prépare la séance comme une décharge (`programSuggestions(..., light)`), et `workouts.is_light` l'écarte des références de la charge suivante.
