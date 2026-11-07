import type { Metadata } from "next";
import { CompareView } from "@/components/progress/compare-view";
import { PageHeader } from "@/components/ui/page-header";
import { isPose } from "@/lib/body";
import { getPhotos } from "../../data";

export const metadata: Metadata = { title: "Comparer deux photos" };

export default async function ComparePhotosPage({ searchParams }: { searchParams: Promise<{ pose?: string; avant?: string; apres?: string }> }) {
  const { pose, avant, apres } = await searchParams;
  const photos = await getPhotos();
  return (
    <>
      <PageHeader back="/progres/photos" title="Comparer" />
      <CompareView pose={isPose(pose) ? pose : "face"} all={photos} avant={avant} apres={apres} />
    </>
  );
}
