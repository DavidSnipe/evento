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
    <div className="min-h-screen bg-[#FDFBF7] text-foreground font-sans relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100/50 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 max-w-md mx-auto px-6 py-12 flex flex-col min-h-screen">
        <header className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-primary/10 text-primary">
              <Heart className="h-6 w-6 fill-primary/40" />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">Bine ai venit la</p>
          <h1 className="text-3xl font-serif font-bold text-foreground leading-tight">
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
