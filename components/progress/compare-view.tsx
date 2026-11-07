import Link from "next/link";
import { PhotoImage } from "@/components/progress/photo-thumb";
import { LinkChips } from "@/components/progress/progress-tabs";
import { buttonClasses } from "@/components/ui/button";
import { PHOTO_POSES, POSE_LABELS, POSE_PHRASE, type Photo, type PhotoPose } from "@/lib/body";
import { formatAxisDate } from "@/lib/charts";
import { daysBetween, formatShortDate } from "@/lib/dates";

function gap(a: string, b: string): string {
  const days = Math.abs(daysBetween(a, b));
  if (days === 0) return "le même jour";
  if (days < 14) return `${days} jour${days > 1 ? "s" : ""} d'écart`;
  const weeks = Math.round(days / 7);
  return `${weeks} semaines d'écart`;
}

/**
 * Deux dates côte à côte pour une même pose. Par défaut, la plus ancienne et la
 * plus récente ; la plus ancienne des deux est toujours à gauche.
 */
export function CompareView({ pose, all, avant, apres }: { pose: PhotoPose; all: Photo[]; avant?: string; apres?: string }) {
  const photos = all.filter((p) => p.pose === pose); // la plus récente en premier
  const after = photos.find((p) => p.id === apres) ?? photos[0];
  const before = photos.find((p) => p.id === avant && p.id !== after?.id) ?? photos.findLast((p) => p.id !== after?.id);
  const [left, right] = before && after && before.takenOn > after.takenOn ? [after, before] : [before, after];
  const href = (b: Photo | undefined, a: Photo | undefined) => `/progres/photos/comparer?pose=${pose}&avant=${b?.id ?? ""}&apres=${a?.id ?? ""}`;

  return (
    <div className="grid gap-4">
      <LinkChips
        label="Pose"
        items={PHOTO_POSES.map((p) => ({ href: `/progres/photos/comparer?pose=${p}`, label: POSE_LABELS[p], current: p === pose }))}
      />

      {!left || !right ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-[15px] text-muted">Il faut au moins deux photos {POSE_PHRASE[pose]} pour comparer deux dates.</p>
          <Link href="/progres/photos/ajouter" className={buttonClasses("primary", "lg")}>
            Ajouter une photo
          </Link>
        </div>
      ) : (
        <>
          <p className="text-[14px] text-muted">
            Du {formatShortDate(left.takenOn)} au {formatShortDate(right.takenOn)}, {gap(left.takenOn, right.takenOn)}.
          </p>
          <div className="grid grid-cols-2 gap-2 md:max-w-4xl md:gap-4">
            {[
              { side: "Avant", photo: left },
              { side: "Après", photo: right },
            ].map(({ side, photo }) => (
              <figure key={side} className="grid content-start gap-1.5">
                <PhotoImage
                  url={photo.url}
                  eager
                  alt={`Photo ${POSE_PHRASE[pose]} du ${formatShortDate(photo.takenOn)}`}
                  className="aspect-[3/4] w-full rounded-control border border-line object-cover"
                />
                <figcaption className="text-[13px]">
                  <span className="font-semibold">{side}</span> <span className="text-muted">· {formatAxisDate(photo.takenOn)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          {photos.length > 2 ? (
            <div className="grid gap-4 md:max-w-4xl md:grid-cols-2">
              <div className="grid gap-2">
                <h2 className="text-sm font-medium">Date de gauche</h2>
                <LinkChips
                  label="Date de gauche"
                  items={[...photos]
                    .reverse()
                    .filter((p) => p.id !== right.id)
                    .map((p) => ({
                      href: p.takenOn <= right.takenOn ? href(p, right) : href(right, p),
                      label: formatAxisDate(p.takenOn),
                      current: p.id === left.id,
                    }))}
                />
              </div>
              <div className="grid gap-2">
                <h2 className="text-sm font-medium">Date de droite</h2>
                <LinkChips
                  label="Date de droite"
                  items={photos
                    .filter((p) => p.id !== left.id)
                    .map((p) => ({
                      href: p.takenOn >= left.takenOn ? href(left, p) : href(p, left),
                      label: formatAxisDate(p.takenOn),
                      current: p.id === right.id,
                    }))}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
