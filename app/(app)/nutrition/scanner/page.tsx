import type { Metadata } from "next";
import { BarcodeScanner } from "@/components/nutrition/barcode-scanner";
import { PageHeader } from "@/components/ui/page-header";
import { creationContext } from "../context";

export const metadata: Metadata = { title: "Scanner un code-barres" };

export default async function ScannerPage({ searchParams }: { searchParams: Promise<{ repas?: string; jour?: string }> }) {
  const ctx = await creationContext(await searchParams);
  return (
    <>
      <PageHeader title="Scanner" back={ctx.back} />
      <div className="md:max-w-xl">
        <BarcodeScanner query={ctx.query} />
      </div>
    </>
  );
}
