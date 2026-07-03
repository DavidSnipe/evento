import { notFound } from "next/navigation";

import { PublicGalleryShell } from "@/components/gallery/public-gallery-shell";
import {
  getEventBySlug,
  getPublicApprovedPhotos,
  getPublicPhotoCount,
} from "@/lib/gallery/queries";

export const metadata = {
  title: "Galerie Eveniment | Evento",
};

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ qr_slug: string }>;
}) {
  const { qr_slug } = await params;

  const [event, photos, photoCount] = await Promise.all([
    getEventBySlug(qr_slug),
    getPublicApprovedPhotos(qr_slug),
    getPublicPhotoCount(qr_slug),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <PublicGalleryShell
      qrSlug={qr_slug}
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.event_date ?? null}
      initialPhotos={photos}
      photoCount={photoCount}
    />
  );
}
