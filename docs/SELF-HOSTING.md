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

## E-mails

Le serveur d'e-mails intégré à Supabase n'envoie qu'aux membres de l'équipe du projet et avec un faible débit. Pour inviter d'autres personnes, configurez un SMTP (par exemple Brevo ou Resend) dans Authentication > SMTP Settings.

## Mises à jour

Récupérez les changements du dépôt d'origine, puis `npx supabase db push` pour appliquer les nouvelles migrations. Les migrations destructives sont toujours signalées dans le CHANGELOG.
