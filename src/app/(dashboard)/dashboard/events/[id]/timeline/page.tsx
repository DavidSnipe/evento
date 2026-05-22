import { AnimatedPage } from "@/components/layout/animated-page";

export const metadata = {
  title: "Cronologie | Evento",
};

export default function TimelinePage() {
  return (
    <AnimatedPage className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h1 className="text-3xl font-serif font-bold mb-4">Cronologie</h1>
      <p className="text-muted-foreground max-w-md">
        Acest modul este în lucru. Aici vei putea vizualiza și edita programul evenimentului tău pe ore.
      </p>
    </AnimatedPage>
  );
}
