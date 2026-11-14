# Auto-héberger Fonte

> Brouillon : ce guide sera complété et testé de bout en bout en v1.0, avec le bouton Deploy to Vercel.

Deux façons d'utiliser Fonte :

| Mode | Pour qui | Ce que ça change |
| --- | --- | --- |
| **Instance partagée** | Les amis invités par Ambroise | Rien à installer. Les données sont dans le projet Supabase d'Ambroise, cloisonnées par la RLS. Amis et séances communes disponibles. |
| **Auto-hébergement** | Ceux qui veulent garder leurs données dans leur propre compte | Votre propre projet Supabase et votre propre déploiement Vercel. **Les fonctions Amis et séances communes ne marchent qu'entre comptes d'une même instance** : vous ne pourrez pas partager avec quelqu'un qui est sur une autre instance. |

## Ce qu'il faut

- Un compte GitHub, un compte Supabase (offre gratuite) et un compte Vercel (offre Hobby, usage non commercial).
- Node.js 22 et la Supabase CLI si vous déployez depuis votre ordinateur.

## Étapes (version provisoire)

1. Forkez le dépôt `Ambroi5e/sport` sur GitHub.
2. Créez un projet Supabase, région la plus proche de vous.
3. Appliquez les migrations : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.
4. Dans Supabase, Authentication > Email Templates, remplacez le modèle « Magic Link » par celui de `supabase/templates/magic-link.html` (il contient le code à 6 chiffres).
5. Dans Authentication > URL Configuration, indiquez l'URL de votre déploiement comme Site URL.
6. Créez le projet sur Vercel depuis votre fork et renseignez les variables de `.env.example`.
7. Générez votre premier code d'invitation (commande documentée en v1.0) et inscrivez-vous.

## E-mails (SMTP personnalisé)

Le serveur d'e-mails intégré à Supabase n'envoie qu'aux membres de l'équipe du projet, avec un débit très faible. Sans SMTP à vous, un ami invité ne reçoit pas son code de connexion et ne peut s'inscrire qu'avec Google. Le réglage se fait dans le tableau de bord Supabase (il contient un mot de passe : jamais dans le dépôt).

### 1. Choisir un service d'envoi

| Service | Gratuit | Expéditeur | Quand le choisir |
| --- | --- | --- | --- |
| **Brevo** | 300 e-mails par jour | une adresse vérifiée par un clic, ou un domaine | sans nom de domaine : le plus simple pour démarrer |
| **Resend** | 3 000 par mois, 100 par jour | un domaine vérifié (enregistrements DNS) | si vous avez un nom de domaine |

Un groupe d'amis envoie quelques e-mails par jour : les offres gratuites suffisent largement. Avec un nom de domaine (et ses enregistrements SPF, DKIM et DMARC), les e-mails arrivent plus sûrement dans la boîte de réception qu'en indésirables.

### 2. Récupérer les identifiants SMTP

- **Brevo** : créez un compte, ajoutez l'adresse d'expédition dans *Expéditeurs* et cliquez sur le lien de vérification reçu. Dans *SMTP & API*, onglet SMTP, notez le serveur (`smtp-relay.brevo.com`), le port (`587`), l'identifiant, et générez une clé SMTP : c'est le mot de passe.
- **Resend** : ajoutez votre domaine et posez les enregistrements DNS indiqués, puis créez une clé d'API. Serveur `smtp.resend.com`, port `465`, identifiant `resend`, mot de passe = la clé d'API.

### 3. Les coller dans Supabase

Authentication > Emails > SMTP Settings, activez *Enable custom SMTP* :

- **Sender email** : l'adresse vérifiée à l'étape 2 ;
- **Sender name** : `Fonte` ;
- **Host**, **Port**, **Username**, **Password** : ceux de l'étape 2 ;
- enregistrez.

Supabase limite alors l'envoi à 30 e-mails par heure (Authentication > Rate Limits) : c'est assez pour un groupe d'amis.

### 4. Vérifier

Depuis une fenêtre privée, demandez un code de connexion avec une adresse qui n'est pas membre du projet Supabase. Le code doit arriver en moins d'une minute ; sinon, regardez les indésirables puis les journaux d'envoi du service (Brevo : *Transactionnel > Journaux*). Les modèles d'e-mail (`supabase/templates/`) ne changent pas.

## Rappels push

Les rappels sont envoyés par votre projet Supabase. Sans cette étape, l'app fonctionne et l'écran Rappels indique qu'ils ne sont pas installés.

1. Déployez la fonction : `npx supabase functions deploy rappels --no-verify-jwt`.
2. Générez une paire de clés VAPID (par exemple `npx web-push generate-vapid-keys --json`, ou `generateVapidKeys` de `supabase/functions/rappels/vapid.ts`). La clé privée doit être au format JWK.
3. Dans l'éditeur SQL de Supabase, rangez trois secrets dans Vault :

   ```sql
   select vault.create_secret('https://<ref>.supabase.co/functions/v1/rappels', 'rappels_function_url');
   select vault.create_secret('<clé publique, base64url>', 'rappels_vapid_public');
   select vault.create_secret('<clé privée, JWK en JSON>', 'rappels_vapid_private_jwk');
   ```

4. La tâche `fonte-rappels` (toutes les 5 minutes) est créée par la migration quand `pg_cron` et `pg_net` sont disponibles. Vérifiez-la avec `select jobname, schedule from cron.job;`.

Ne changez pas les clés une fois des appareils abonnés : ils devraient tous réactiver les rappels.

## Mises à jour

Récupérez les changements du dépôt d'origine, puis `npx supabase db push` pour appliquer les nouvelles migrations. Les migrations destructives sont toujours signalées dans le CHANGELOG.
