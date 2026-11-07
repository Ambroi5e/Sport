import { CameraIcon, LockSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PhotoImage } from "@/components/progress/photo-thumb";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PHOTO_POSES, POSE_LABELS, POSE_PHRASE, type Photo } from "@/lib/body";
import { formatShortDate } from "@/lib/dates";

/** Section Photos : photos par date, ajout et accès à la comparaison. */
export function PhotosView({ photos }: { photos: Photo[] }) {
  const byDate = new Map<string, Photo[]>();
  for (const p of photos) byDate.set(p.takenOn, [...(byDate.get(p.takenOn) ?? []), p]);
  const comparable = PHOTO_POSES.find((pose) => photos.filter((p) => p.pose === pose).length >= 2);

  return (
    <>
      <div className="mb-4 flex gap-2 md:mb-6">
        <Link href="/progres/photos/ajouter" className={buttonClasses("primary", "lg", "flex-1 whitespace-nowrap sm:flex-none")}>
          <CameraIcon size={20} aria-hidden="true" /> Ajouter une photo
        </Link>
        {comparable ? (
          <Link href={`/progres/photos/comparer?pose=${comparable}`} className={buttonClasses("secondary", "lg", "shrink-0")}>
            Comparer
          </Link>
        ) : null}
      </div>

      {photos.length === 0 ? (
        <EmptyState icon={<CameraIcon size={22} />} title="Aucune photo pour l'instant">
          Face, profil et dos, toutes les deux à quatre semaines, même lumière et même endroit : tu pourras comparer deux dates côte à côte.
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {[...byDate].map(([date, list]) => (
            <section key={date} aria-labelledby={`photos-${date}`} className="grid gap-2">
              <h2 id={`photos-${date}`} className="text-[15px] font-semibold">
                {formatShortDate(date)}
              </h2>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link href={`/progres/photos/${p.id}`} className="group grid gap-1 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                      <PhotoImage url={p.url} alt={`Photo ${POSE_PHRASE[p.pose]} du ${formatShortDate(p.takenOn)}`} className="aspect-[3/4] w-full rounded-control border border-line transition-opacity group-hover:opacity-90" />
                      <span className="text-[13px] text-muted">{POSE_LABELS[p.pose]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 flex max-w-prose items-start gap-2 text-[13px] text-muted">
        <LockSimpleIcon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Tes photos sont privées : personne d&apos;autre ne peut les voir, pas même tes amis. Elles sont rangées dans ton dossier personnel et chaque
        lien d&apos;affichage expire au bout de 10 minutes.
      </p>
    </>
  );
}
