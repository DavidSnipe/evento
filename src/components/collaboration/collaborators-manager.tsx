"use client";

import { InviteCollaboratorForm } from "@/components/collaboration/invite-collaborator-form";
import { CollaboratorRow } from "@/components/collaboration/collaborator-row";
import { useCollaboratorsOptimistic } from "@/hooks/collaboration/use-collaborators-optimistic";
import { ro } from "@/lib/i18n/ro";
import type { EventMemberView } from "@/types/collaboration";

type CollaboratorsManagerProps = {
  eventId: string;
  initialMembers: EventMemberView[];
  inviteBaseUrl: string;
  canManage: boolean;
};

export function CollaboratorsManager({
  eventId,
  initialMembers,
  inviteBaseUrl,
  canManage,
}: CollaboratorsManagerProps) {
  const {
    members,
    syncingCollaboratorIds,
    inviteOptimistic,
    updateRoleOptimistic,
    removeOptimistic,
  } = useCollaboratorsOptimistic(eventId, initialMembers);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[rgba(210,170,185,0.2)] bg-gradient-to-br from-[#FEF8F9] to-white p-5">
        <h2 className="font-serif text-lg font-semibold text-[#1A0E14]">
          {ro.collaboration.subtitle}
        </h2>
        <p className="mt-1 text-sm text-text-secondary leading-relaxed">
          {ro.collaboration.desc}
        </p>
      </div>

      {canManage && (
        <InviteCollaboratorForm
          onInvite={(email, role) => inviteOptimistic(email, role)}
        />
      )}

      <div className="space-y-3">
        {members.map((member) => (
          <CollaboratorRow
            key={member.isOwner ? "owner" : member.id}
            member={member}
            inviteBaseUrl={inviteBaseUrl}
            syncing={!member.isOwner && syncingCollaboratorIds.has(member.id)}
            canManage={canManage}
            onRoleChange={(id, role) => updateRoleOptimistic(id, role)}
            onRemove={(id) => removeOptimistic(id)}
          />
        ))}
      </div>
    </div>
  );
}
