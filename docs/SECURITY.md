# Sécurité et confidentialité

Les données de santé (poids, mensurations, photos, forme, nutrition) sont des données sensibles au sens du RGPD (article 9). Fonte les traite comme telles : minimisation, cloisonnement strict par utilisateur, export et suppression à la demande.

## Cloisonnement des données

- RLS activée sur toutes les tables du schéma `public`. Quatre politiques par table (select, insert, update, delete) limitées à `user_id = (select auth.uid())`.
- Le partage entre amis passe uniquement par `public.can_view(owner, catégorie)` : amitié acceptée des deux côtés et permission active. Lecture seule.
- Un test vérifie qu'aucune table de `public` n'a la RLS désactivée. Chaque table a ses tests : A ne lit, ne modifie ni ne supprime les lignes de B.
- Fonctions `security definer` : `search_path` fixé à vide, noms entièrement qualifiés, droits `execute` retirés à `public` et `anon` quand ils ne sont pas nécessaires.
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
- HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive.
- Photos dans un bucket privé, URLs signées de 60 secondes.

## Fichiers importés

Taille maximale et type vérifiés avant lecture (CSV 5 Mo, GPX et FIT 20 Mo, export Apple Santé lu sur le téléphone). Chaque ligne validée par zod ; une ligne invalide est rejetée et signalée, jamais insérée partiellement.

## Avant chaque mise en production

1. `npm audit --omit=dev` et alertes Dependabot traitées.
2. `get_advisors` Supabase (sécurité et performance) sans alerte non expliquée.
3. Tests RLS verts.
4. Revue de sécurité du diff.
5. Feu vert d'Ambroise.

## Qui a techniquement accès aux données

Sur l'instance partagée : l'administrateur du projet Supabase (Ambroise) peut techniquement lire la base depuis le tableau de bord Supabase, comme tout hébergeur. L'app ne lui donne aucun accès au contenu. La page Confidentialité de l'app le dira clairement (v0.7). L'auto-hébergement supprime cette dépendance, au prix des fonctions entre amis.
