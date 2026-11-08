# Sécurité et confidentialité

Les données de santé (poids, mensurations, photos, forme, nutrition) sont des données sensibles au sens du RGPD (article 9). Fonte les traite comme telles : minimisation, cloisonnement strict par utilisateur, export et suppression à la demande.

## Cloisonnement des données

- RLS activée sur toutes les tables du schéma `public`. Quatre politiques par table (select, insert, update, delete) limitées à `user_id = (select auth.uid())`.
- Le partage entre amis passe uniquement par `public.can_view(owner, catégorie)` : amitié acceptée des deux côtés et permission active. Lecture seule.
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
