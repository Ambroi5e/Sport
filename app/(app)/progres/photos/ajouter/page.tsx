import type { Metadata } from "next";
import { PhotoForm } from "@/components/progress/photo-form";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { uploadPhoto } from "../../actions";

export const metadata: Metadata = { title: "Ajouter une photo" };

export default async function AddPhotoPage() {
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  return (
    <>
      <PageHeader back="/progres/photos" title="Ajouter une photo" />
      <div className="grid gap-4 md:max-w-xl">
        <p className="text-[14px] text-muted">
          Pour comparer d&apos;une fois sur l&apos;autre : même lumière, même endroit, même distance, de préférence le matin.
        </p>
        <PhotoForm action={uploadPhoto} today={today} minDate={addDays(today, -730)} />
      </div>
    </>
  );
}
