import { notFound } from "next/navigation";

import {
  InviteAcceptClient,
  InvitePageShell,
} from "@/components/collaboration/invite-accept-client";
import { getCollaboratorInviteByToken } from "@/lib/collaboration/queries";
import { normalizeCollaboratorEmail } from "@/lib/collaboration/validation";
import { createClient } from "@/lib/supabase/server";
import { ro } from "@/lib/i18n/ro";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function CollaboratorInvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await getCollaboratorInviteByToken(token);

  if (!invite || invite.status !== "pending") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const eventTitle = invite.event?.title ?? ro.collaboration.invite.unknownEvent;
  const roleLabel =
    ro.collaboration.roles[invite.role as "editor" | "contributor" | "viewer"];
  const emailMatches =
    !!user?.email &&
    normalizeCollaboratorEmail(user.email) === normalizeCollaboratorEmail(invite.email);

  return (
    <InvitePageShell>
      <h1 className="font-serif text-xl font-semibold text-[#1A0E14] text-center mb-2">
        {ro.collaboration.invite.title}
      </h1>
      <p className="text-sm text-text-secondary text-center mb-6">
        {ro.collaboration.invite.subtitle}
      </p>
      <InviteAcceptClient
        token={token}
        eventTitle={eventTitle}
        role={roleLabel}
        email={invite.email}
        isAuthenticated={!!user}
        emailMatches={emailMatches}
      />
    </InvitePageShell>
  );
}
