import { notFound } from "next/navigation";

import { PublicInvitationTemplate } from "@/components/invitation/public-invitation-template";
import { PublicRsvpFlow } from "@/components/rsvp/public-rsvp-flow";
import { getPublicInvitationByRsvpSlug } from "@/lib/rsvp/public-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invitation = await getPublicInvitationByRsvpSlug(slug);
  const title = invitation?.coupleNames ?? invitation?.title ?? "Invitație";
  return {
    title: `${title} | RSVP`,
    description: "Confirmă prezența la eveniment",
  };
}

type PublicRsvpPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicRsvpPage({ params }: PublicRsvpPageProps) {
  const { slug } = await params;
  const invitation = await getPublicInvitationByRsvpSlug(slug);

  if (!invitation) {
    notFound();
  }

  return (
    <div className="min-h-[100dvh] bg-[#FDFBF7] text-foreground font-sans relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-[15%] -left-[20%] h-[45%] w-[70%] rounded-full bg-primary/8 blur-[90px]" />
        <div className="absolute -bottom-[10%] -right-[15%] h-[50%] w-[65%] rounded-full bg-orange-100/40 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <main className="flex-1 space-y-12">
          <PublicInvitationTemplate invitation={invitation} />
          <PublicRsvpFlow rsvpSlug={slug} invitation={invitation} />
        </main>

        <footer className="mt-10 pb-2 text-center text-[10px] tracking-wide text-muted-foreground/50">
          Evento
        </footer>
      </div>
    </div>
  );
}
