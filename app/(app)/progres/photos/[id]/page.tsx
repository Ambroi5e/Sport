import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoImage } from "@/components/progress/photo-thumb";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { POSE_LABELS, POSE_PHRASE } from "@/lib/body";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import { deletePhoto } from "../../actions";
import { getPhoto } from "../../data";

export const metadata: Metadata = { title: "Photo de progression" };

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await getPhoto(id);
  if (!photo) notFound();

  return (
    <>
      <PageHeader back="/progres/photos" eyebrow={POSE_LABELS[photo.pose]} title={formatLongDate(photo.takenOn)} />
      <div className="grid gap-4 md:max-w-xl">
        <PhotoImage url={photo.url} eager alt={`Photo ${POSE_PHRASE[photo.pose]} du ${formatShortDate(photo.takenOn)}`} className="max-h-[70dvh] w-full rounded-control border border-line object-contain" />
        <Link href={`/progres/photos/comparer?pose=${photo.pose}&apres=${photo.id}`} className={buttonClasses("secondary", "lg", "w-full")}>
          Comparer avec une autre date
        </Link>
        <ConfirmAction
          action={deletePhoto.bind(null, photo.id)}
          label="Supprimer la photo"
          confirmLabel="Supprimer"
          question={`Supprimer la photo ${POSE_PHRASE[photo.pose]} du ${formatShortDate(photo.takenOn)} ? Le fichier est effacé pour de bon.`}
        />
      </div>
    </>
  );
}
