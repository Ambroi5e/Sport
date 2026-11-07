import type { Metadata } from "next";
import { PhotosView } from "@/components/progress/photos-view";
import { ProgressTabs } from "@/components/progress/progress-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { getPhotos } from "../data";

export const metadata: Metadata = { title: "Photos de progression" };

export default async function PhotosPage() {
  const photos = await getPhotos();
  return (
    <>
      <PageHeader title="Progrès" />
      <ProgressTabs current="/progres/photos" />
      <PhotosView photos={photos} />
    </>
  );
}
