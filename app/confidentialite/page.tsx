import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getUserId } from "@/lib/auth";

export const metadata: Metadata = { title: "Confidentialité" };

/** Date de la dernière modification de cette page, à changer avec son contenu. */
const UPDATED = "8 novembre 2026";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="grid gap-3 text-[15px] leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-text">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5 marker:text-muted">{children}</ul>;
}

const inline = "font-medium text-accent-text underline underline-offset-4";

/**
 * Ce que Fonte garde, où, qui peut le lire et ce qui en sort. Publique : on la lit
 * avant de s'inscrire. Tout ce qui est écrit ici doit rester vrai (voir docs/SECURITY.md).
 */
export default async function PrivacyPage() {
  const signedIn = (await getUserId()) !== null;

  return (
    <main className="pt-safe mx-auto w-full max-w-2xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:px-8">
      <PageHeader title="Confidentialité" back={signedIn ? "/reglages" : "/connexion"} />
      <div className="grid gap-8">
        <div className="grid gap-3 rounded-control border border-line bg-surface p-4 md:p-5">
          <p className="label-caps">En bref</p>
          <ul className="grid gap-2 text-[15px]">
            <li>Tes données ne servent qu&apos;à toi : pas de publicité, pas de mesure d&apos;audience, pas de revente, pas d&apos;IA.</li>
            <li>Personne d&apos;autre dans Fonte ne les voit sans ta permission.</li>
            <li>Tu peux tout exporter ou tout supprimer, photos comprises, à tout moment et sans rien demander.</li>
          </ul>
        </div>

        <Section id="garde" title="Ce que Fonte garde">
          <List>
            <li>
              <strong>Ton compte</strong> : ton adresse e-mail et ta façon de te connecter (code par e-mail ou Google).
            </li>
            <li>
              <strong>Ton profil</strong> : année de naissance, sexe, taille, niveau, jours d&apos;entraînement, objectifs.
            </li>
            <li>
              <strong>Ce que tu notes</strong> : séances et séries, sports (durée, intensité), programmes, aliments, recettes, repas, cibles,
              pesées, mensurations, photos de progression, forme du jour (sommeil, courbatures, énergie, stress).
            </li>
          </List>
          <p>
            Le poids, les mensurations, les photos, ce que tu manges et ta forme du jour sont des <strong>données de santé</strong>, sensibles au sens du
            RGPD. Fonte ne garde que ce qui sert à l&apos;app et ne les utilise pour rien d&apos;autre.
          </p>
        </Section>

        <Section id="ou" title="Où elles sont">
          <List>
            <li>
              Dans une base de données <strong>Supabase</strong>, hébergée à Paris. Chaque ligne porte ton identifiant, et la base
              refuse d&apos;en montrer une à quelqu&apos;un d&apos;autre.
            </li>
            <li>
              Tes photos sont dans un espace de stockage <strong>privé</strong> : aucune adresse publique, des liens d&apos;affichage
              valables 10 minutes, et ni position GPS ni modèle d&apos;appareil (retirés sur ton téléphone avant l&apos;envoi).
            </li>
            <li>
              L&apos;app est servie par <strong>Vercel</strong>, depuis Paris elle aussi.
            </li>
          </List>
        </Section>

        <Section id="qui" title="Qui peut les lire">
          <List>
            <li>
              <strong>Toi</strong>, une fois connecté.
            </li>
            <li>
              <strong>Tes amis</strong> : rien pour l&apos;instant. Le partage entre amis arrivera plus tard, catégorie par catégorie,
              seulement si tu l&apos;actives, et il se retirera à tout moment.
            </li>
            <li>
              <strong>L&apos;administrateur de cette instance</strong> (la personne qui gère le projet Supabase) peut techniquement lire
              la base depuis le tableau de bord de l&apos;hébergeur, comme pour toute app hébergée. Fonte ne lui donne aucun accès à ton
              contenu : sa page d&apos;administration n&apos;affiche que des compteurs (nombre de comptes et d&apos;invitations).
            </li>
            <li>
              <strong>Supabase et Vercel</strong>, comme hébergeurs, pour faire tourner le service.
            </li>
          </List>
          <p>Pour ne dépendre de personne, Fonte peut être auto-hébergé, au prix des fonctions entre amis.</p>
        </Section>

        <Section id="sort" title="Ce qui sort de Fonte">
          <List>
            <li>
              <strong>Un code-barres scanné</strong> est envoyé à Open Food Facts par le serveur de Fonte : seulement le code, jamais
              ton identité ni ton adresse IP.
            </li>
            <li>
              <strong>Une photo d&apos;étiquette</strong> est lue sur ton téléphone : elle n&apos;est ni envoyée ni gardée.
            </li>
            <li>
              <strong>Avec Google</strong>, Google sait que tu te connectes à Fonte, et Fonte reçoit ton adresse e-mail et le nom de ton
              compte.
            </li>
            <li>
              <strong>Les e-mails de connexion</strong> passent par un service d&apos;envoi d&apos;e-mails, qui reçoit ton adresse pour
              les livrer.
            </li>
          </List>
        </Section>

        <Section id="appareil" title="Sur ton téléphone">
          <p>
            Deux sortes de cookies seulement : celui de ta session (pour rester connecté) et tes préférences (thème, style). Aucun cookie
            de mesure ni de publicité.
          </p>
          <p>
            L&apos;app garde aussi sur le téléphone les saisies pas encore envoyées (sans réseau), le chrono et la séance en cours. Tout est
            effacé quand tu te déconnectes.
          </p>
        </Section>

        <Section id="duree" title="Combien de temps">
          <p>
            Tant que ton compte existe. Ce que tu supprimes dans l&apos;app est effacé tout de suite de la base. Quand tu supprimes ton
            compte, tout part immédiatement, photos comprises. Les sauvegardes techniques de l&apos;hébergeur, s&apos;il y en a,
            s&apos;effacent d&apos;elles-mêmes selon sa propre durée de conservation.
          </p>
        </Section>

        <Section id="droits" title="Tes droits">
          <List>
            <li>
              <strong>Récupérer tes données</strong>, pour les lire ou les emmener ailleurs :{" "}
              <Link href="/reglages/donnees" className={inline}>
                Exporter mes données
              </Link>{" "}
              (JSON, CSV pour un tableur, et tes photos).
            </li>
            <li>
              <strong>Les corriger</strong> : tout se modifie dans l&apos;app.
            </li>
            <li>
              <strong>Tout effacer</strong> :{" "}
              <Link href="/reglages/supprimer" className={inline}>
                Supprimer mon compte
              </Link>
              .
            </li>
          </List>
          <p>
            Pour toute question, écris à la personne qui t&apos;a invité : c&apos;est elle, ou l&apos;administrateur de cette instance,
            qui en répond. Tu peux aussi t&apos;adresser à la CNIL.
          </p>
        </Section>

        <Section id="sante" title="Santé">
          <p>
            Fonte donne des repères généraux, pas un avis médical. En cas de problème de santé, de douleur ou de trouble de
            l&apos;alimentation, parles-en à un professionnel.
          </p>
        </Section>

        <p className="text-[13px] text-muted">Mise à jour le {UPDATED}.</p>
      </div>
    </main>
  );
}
