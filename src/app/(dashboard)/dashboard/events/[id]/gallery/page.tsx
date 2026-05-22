import { notFound } from "next/navigation";
import { getEventGalleryInfo, getMediaUploads } from "@/lib/gallery/queries";
import { GalleryClient } from "@/components/gallery/gallery-client";
import { AnimatedPage } from "@/components/layout/animated-page";

export const metadata = {
  title: "Galerie & QR | Evento",
};

export default async function GalleryAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const info = await getEventGalleryInfo(id);

  if (!info) {
    notFound();
  }

  const media = await getMediaUploads(id);

  return (
    <AnimatedPage className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Galerie & QR Code
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestionează fotografiile și generează codul QR pentru invitații tăi la {info.title}.
        </p>
      </div>

      <GalleryClient 
        eventId={id} 
        initialQrSlug={info.qr_slug} 
        initialMedia={media} 
      />
    </AnimatedPage>
  );
}
