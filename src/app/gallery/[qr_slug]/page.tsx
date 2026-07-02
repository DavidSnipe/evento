import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/gallery/queries";
import { UploadClient } from "@/components/gallery/upload-client";
import { Heart } from "lucide-react";

export const metadata = {
  title: "Încarcă Amintiri | Evento",
};

export default async function PublicGalleryUploadPage({
  params,
}: {
  params: Promise<{ qr_slug: string }>;
}) {
  const { qr_slug } = await params;
  
  // Fetch event using slug
  const event = await getEventBySlug(qr_slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="evento-public-page min-h-screen font-sans relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-[var(--color-blush-light)]/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-[var(--color-dash-ivory)] blur-[100px]" />
      
      <div className="relative z-10 max-w-md mx-auto px-6 py-12 flex flex-col min-h-screen">
        <header className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-border-rose-18 text-[var(--color-rose-dark)]">
              <Heart className="h-6 w-6 fill-[var(--color-blush-light)]" />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-secondary font-semibold mb-2">Bine ai venit la</p>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-dash-text)] leading-tight">
            {event.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Împarte cu noi momentele pe care le-ai surprins astăzi. Nu este nevoie de cont!
          </p>
        </header>

        <main className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          <UploadClient eventId={event.id} />
        </main>
        
        <footer className="mt-12 text-center text-xs text-muted-foreground/60 pb-6">
          <p>Powered by Evento &bull; Upload Securizat</p>
        </footer>
      </div>
    </div>
  );
}
