# Sécurité et confidentialité

Les données de santé (poids, mensurations, photos, forme, nutrition) sont des données sensibles au sens du RGPD (article 9). Fonte les traite comme telles : minimisation, cloisonnement strict par utilisateur, export et suppression à la demande.

## Cloisonnement des données

- RLS activée sur toutes les tables du schéma `public`. Quatre politiques par table (select, insert, update, delete) limitées à `user_id = (select auth.uid())`.
- Le partage entre amis passe uniquement par `public.can_view(owner, catégorie)` : amitié en place et permission active. Lecture seule, par des fonctions dédiées ; les politiques des tables de données restent limitées à leur propriétaire (détail plus bas, « Amis et partage »).
- Un test vérifie qu'aucune table de `public` n'a la RLS désactivée. Chaque table a ses tests : A ne lit, ne modifie ni ne supprime les lignes de B.
- Fonctions `security definer` : `search_path` fixé à vide, noms entièrement qualifiés, droits `execute` retirés à `public` et `anon` quand ils ne sont pas nécessaires.
- Rattachements entre tables d'un même utilisateur par clés étrangères composites `(id, user_id)` : un élément de modèle ne peut pas viser le modèle d'un autre, un modèle ne peut pas rejoindre le programme d'un autre (v0.6), un ingrédient ne peut pas viser la recette d'un autre (v0.6.1). Les exercices visés (objectif d'un programme, préférences) doivent être du catalogue commun ou à soi (`exercise_is_usable`).
- Page admin : uniquement des compteurs via une fonction réservée au rôle admin, jamais le contenu.

## Comptes

- Inscription seulement avec un code d'invitation valide, vérifié par un déclencheur sur `auth.users` (contournement de l'interface impossible).
- Codes stockés hachés (SHA-256), usage unique, date d'expiration.
- Connexion par e-mail (code à 6 chiffres) ou Google (OAuth avec PKCE, géré par Supabase). Pas de mot de passe stocké.
- Inscription avec Google : `reserve_invitation(code, e-mail)`, appelable sans être connecté, réserve un code valable 15 minutes pour une adresse ; le déclencheur ne crée le compte que si l'adresse Google correspond. La fonction ne révèle rien de plus que le formulaire d'inscription (code valable ou non), et l'espace des codes (31^8) rend l'essai systématique hors de portée.
- Limitation de débit : celle de Supabase Auth sur l'envoi d'e-mails, plus une limite par IP sur les Server Actions d'authentification et d'import.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` : jamais dans le navigateur ni dans le dépôt, uniquement dans les Edge Functions et les variables serveur de Vercel.
- Variables publiques (`NEXT_PUBLIC_*`) limitées à l'URL Supabase et à la clé publishable.
- `.env.example` documente chaque variable ; `.env*` est ignoré par git ; gitleaks tourne en CI.
- Tokens OAuth tiers (Strava) chiffrés en AES-256-GCM avec une clé serveur, révocables. Jeton personnel du Raccourci iOS stocké haché.

## Navigateur

- CSP stricte avec nonce par requête (générée dans `proxy.ts`), `frame-ancestors 'none'`.
- HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive (caméra pour Fonte seule depuis la v0.6.2, pour scanner un code-barres ; micro, position, paiement et USB fermés).
- CSP : `'wasm-unsafe-eval'` ajouté en v0.6.2 pour compiler le lecteur de codes-barres en WebAssembly ; il n'autorise ni `eval` ni les scripts en ligne.
- Open Food Facts est interrogé par le serveur : seul le code-barres sort, jamais l'identité ni l'adresse IP de la personne. La photo d'étiquette est lue sur le téléphone, jamais envoyée ni gardée.
- Cache du service worker : fichiers statiques seulement, plus une exception assumée depuis la v0.3, la copie de la séance en cours (une seule page) pour la rouvrir sans réseau. Elle est remplacée à chaque nouvelle séance et effacée à la fin de la séance et à la déconnexion.
- `localStorage` : file des saisies pas encore envoyées, chrono et réglages de séance. Chaque opération en file porte l'identifiant de son auteur et ne part qu'avec sa session ; la RLS refuse de toute façon d'écrire chez un autre. La déconnexion efface tout ce que l'app a gardé sur l'appareil, après avoir prévenu s'il reste des saisies non envoyées.

## Photos de progression

- Bucket Supabase Storage privé `progress-photos` : aucune URL publique, JPEG seulement, 1 Mo au plus (limites du bucket).
- Un dossier par utilisateur (`<user_id>/<id>.jpg`). Politiques de `storage.objects` : lecture, dépôt et suppression seulement dans son propre dossier. Le chemin enregistré dans `progress_photos` est imposé par une contrainte. Tests RLS sur une copie du schéma `storage`.
- Réduction et réencodage sur le téléphone avant l'envoi : 1 600 px, sans métadonnées EXIF, donc sans position GPS ni modèle d'appareil. Le serveur revérifie le type, la taille et la signature JPEG.
- Affichage par liens signés de 10 minutes, générés côté serveur à chaque page. 10 minutes plutôt que 60 secondes : les vignettes se chargent au défilement, un lien trop court casserait l'affichage d'une page ouverte depuis une minute. Pas d'optimiseur d'images : aucune copie hors du bucket.
- Suppression d'une photo : le fichier est effacé avant la ligne, jamais de fichier orphelin. Suppression du compte : tout le dossier est effacé d'abord, et `delete_my_account()` refuse tant qu'il reste un fichier.
- Jamais montrées aux amis tant que la permission « photos » n'existe pas (v0.9), et alors seulement sur accord explicite.

## Export et suppression du compte (v0.7)

- Export lu au nom de la personne (RLS) avec un filtre `user_id` explicite, jamais de clé `service_role`. Réponses `Cache-Control: private, no-store`. Les invitations restent hors de l'export (codes hachés, adresses d'autres personnes).
- L'archive se construit sur le téléphone ; les photos viennent directement de Storage par des liens signés de 10 minutes. Rien n'est gardé côté serveur.
- CSV : une cellule de texte commençant par `=`, `+`, `-` ou `@` est préfixée d'une apostrophe, pour qu'un nom de produit (venu d'Open Food Facts par exemple) ne devienne jamais une formule dans un tableur.
- Suppression : confirmation tapée, photos effacées par l'API Storage (Supabase interdit de les effacer en SQL), puis `public.delete_my_account()` (`security definer`, `search_path` vide) supprime la ligne `auth.users` de la personne connectée ; tout suit par cascade. Elle refuse sans session et tant qu'un fichier reste. Retirer son `execute` au rôle `anon` attend dans `supabase/pending-destructive/`.
- Les sauvegardes techniques de l'hébergeur, s'il y en a, ne sont pas effacées par l'app ; la page Confidentialité le dit.

## Sports et forme du jour (v0.8)

- `activities` et `daily_checkins` ont la RLS habituelle (quatre politiques limitées à `user_id = (select auth.uid())`), testée dans `supabase/tests/rls-sports-forme.test.ts` : lecture, modification et suppression refusées à un autre compte, écriture au nom d'un autre refusée, visiteur sans accès, contraintes de valeurs.
- Sommeil, courbatures, énergie et stress sont des données de santé : même régime que le poids (export, suppression du compte par cascade, rien de partagé). Le partage par catégorie de la v0.9 (`forme`) sera désactivé par défaut.

## Planning (v0.8.1)

- `weekly_sports`, `session_pins` et `blocked_days` ont la RLS habituelle, testée dans `supabase/tests/rls-planning.test.ts`. `session_pins` référence la séance par `(template_id, user_id)` : impossible de déplacer la séance d'un autre compte, même en connaissant son identifiant.
- Rien de prévu n'est stocké : le planning et le conseil du jour se calculent à la lecture, à partir des données de la personne seule. Le conseil reste général et rappelle de consulter un professionnel quand la forme n'est pas bonne.

## Amis et partage (v0.9)

- **Pas d'annuaire** : aucune requête ne permet de chercher un compte. Une amitié naît d'un code d'ami (`AMI-XXXX-XXXX`, 31^8 possibilités, haché en SHA-256, usage unique, 7 jours, cinq en attente au plus) créé par l'un et saisi par l'autre. `friendships` et `friend_invites` n'ont pas de politique d'insertion ni de modification : seules `create_friend_invite` et `accept_friend_invite` y écrivent.
- **Rien par défaut** : `share_grants` (propriétaire, ami, catégorie) est vide tant que la personne n'ouvre rien. On ne peut ouvrir qu'à un ami et qu'en son propre nom ; l'ami lit la ligne mais ne peut ni la modifier ni la supprimer.
- **Lecture par fonctions** : `friend_workouts`, `friend_activities`, `friend_records`, `friend_weights`, `friend_measurements`, `friend_nutrition`, `friend_checkins` (`security definer`, `search_path` vide) vérifient `can_view` et refusent (`not_shared`) sinon. Elles ne renvoient qu'un résumé borné : pas de notes de séance ni de pesée, pas de détail des repas, aucune photo. Les tables elles-mêmes restent fermées à l'ami, même toutes permissions ouvertes : aucune requête de l'app ne peut mélanger ses lignes avec celles d'un autre.
- **Profil** : un ami ne lit que le prénom (`friends_overview`), jamais la ligne `profiles`.
- **Révocation** : supprimer la ligne de `share_grants` coupe l'accès à la requête suivante ; supprimer l'amitié efface les permissions des deux côtés (déclencheur), et une permission sans amitié ne donne rien.
- Tout cela est testé dans `supabase/tests/rls-amis.test.ts` (27 tests), y compris le tiers, le visiteur et chaque fonction face à chaque catégorie.
- En attente de validation : retirer au rôle `anon` le droit d'appeler ces fonctions (`supabase/pending-destructive/20261117010000_amis_sans_anon.sql`). Sans session elles refusent déjà.

## Séances communes (v0.9.1)

- On n'invite que ses amis, et seulement dans une séance commune qu'on a lancée (politique d'insertion de `group_participants`). Personne ne rejoint à la place d'un autre.
- `group_events` est une copie réduite des séries (nom de l'exercice, charge, répétitions, durée), écrite par le seul déclencheur `share_set_with_group` : aucune politique d'écriture. Elle n'est lisible que par les participants qui ont rejoint (`is_group_member`). `workouts` et `workout_sets` restent fermées aux autres.
- Rien ne part sans avoir rejoint, ni pour une série d'échauffement, ni après la fin, ni plus de six heures après le lancement. Le déclencheur avale ses propres erreurs : il ne peut pas empêcher d'enregistrer une série.
- Les participants ne sont pas forcément amis entre eux : `group_people` ne leur donne que le prénom.
- Temps réel : seules `group_events` et `group_participants` sont publiées, et Realtime applique leurs politiques de lecture. Le client navigateur (`lib/supabase/browser.ts`) n'a que la clé publique et la session de la personne.
- Testé dans `supabase/tests/rls-seances-communes.test.ts` (12 tests).

## Courses et budget (v0.10)

- `shopping_items`, `food_prices` et `purchases` ont les quatre politiques limitées à `user_id = (select auth.uid())`. Un article ou un prix ne peut viser qu'un aliment du catalogue ou à soi (`food_is_usable`).
- Rien de ces tables n'est partagé avec les amis : aucune fonction `friend_*` ne les lit.
- Le budget (`profiles.weekly_food_budget`) n'a pas de valeur par défaut.
- Testé dans `supabase/tests/rls-courses.test.ts` (12 tests).

## Fichiers importés

Taille maximale et type vérifiés avant lecture (CSV 5 Mo, GPX et FIT 20 Mo, export Apple Santé lu sur le téléphone). Chaque ligne validée par zod ; une ligne invalide est rejetée et signalée, jamais insérée partiellement.

## Avant chaque mise en production

1. `npm audit --omit=dev` et alertes Dependabot traitées.
2. `get_advisors` Supabase (sécurité et performance) sans alerte non expliquée.
3. Tests RLS verts.
4. Revue de sécurité du diff.
5. Feu vert d'Ambroise.

## Qui a techniquement accès aux données

Sur l'instance partagée : l'administrateur du projet Supabase (Ambroise) peut techniquement lire la base depuis le tableau de bord Supabase, comme tout hébergeur. L'app ne lui donne aucun accès au contenu. La page Confidentialité de l'app le dit (v0.7). L'auto-hébergement supprime cette dépendance, au prix des fonctions entre amis.
