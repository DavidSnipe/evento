import { AnimatedPage } from "@/components/layout/animated-page";

export const metadata = {
  title: "RSVP | Evento",
};

export default function RsvpPage() {
  return (
    <AnimatedPage className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h1 className="text-3xl font-serif font-bold mb-4">RSVP & Invitații Digitale</h1>
      <p className="text-muted-foreground max-w-md">
        Acest modul este în lucru. Aici vei putea genera link-ul invitației digitale pentru a strânge confirmările invitaților tăi.
      </p>
    </AnimatedPage>
  );
}
