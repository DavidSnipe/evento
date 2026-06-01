"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
} from "@/app/(dashboard)/dashboard/events/[id]/settings/collaborators/actions";
import type {
  CollaboratorRole,
  EventCollaboratorRow,
  EventMemberView,
} from "@/types/collaboration";

type PendingUpdate = {
  fields: Partial<EventCollaboratorRow>;
};

export function useCollaboratorsOptimistic(
  eventId: string,
  initialMembers: EventMemberView[]
) {
  const collaborators = initialMembers.filter(
    (m): m is EventCollaboratorRow & { isOwner?: false } => !m.isOwner
  );
  const owner = initialMembers.find((m) => m.isOwner) ?? null;

  const [localCollaborators, setLocalCollaborators] = useState(collaborators);
  const [syncingCounts, setSyncingCounts] = useState<Record<string, number>>({});
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());

  useEffect(() => {
    setLocalCollaborators(
      initialMembers.filter(
        (m): m is EventCollaboratorRow & { isOwner?: false } => !m.isOwner
      )
    );
  }, [initialMembers]);

  const bumpSync = useCallback((id: string, delta: number) => {
    setSyncingCounts((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const members: EventMemberView[] = owner
    ? [owner, ...localCollaborators.map((c) => ({ ...c, isOwner: false as const }))]
    : localCollaborators.map((c) => ({ ...c, isOwner: false as const }));

  const inviteOptimistic = useCallback(
    async (email: string, role: CollaboratorRole) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: EventCollaboratorRow = {
        id: tempId,
        event_id: eventId,
        email: email.trim().toLowerCase(),
        user_id: null,
        role,
        status: "pending",
        invite_token: `temp-token-${tempId}`,
        invited_by: null,
        invited_at: new Date().toISOString(),
        responded_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setLocalCollaborators((prev) => [...prev, optimistic]);
      bumpSync(tempId, 1);

      const result = await inviteCollaborator(eventId, email, role);
      bumpSync(tempId, -1);

      if (result.error) {
        setLocalCollaborators((prev) => prev.filter((c) => c.id !== tempId));
        return result;
      }

      if (result.id) {
        setLocalCollaborators((prev) =>
          prev.map((c) =>
            c.id === tempId
              ? {
                  ...c,
                  id: result.id!,
                  invite_token: result.inviteUrl?.split("/").pop() ?? c.invite_token,
                }
              : c
          )
        );
      }

      return result;
    },
    [eventId, bumpSync]
  );

  const updateRoleOptimistic = useCallback(
    async (collaboratorId: string, role: CollaboratorRole) => {
      const before = localCollaborators.find((c) => c.id === collaboratorId);
      setLocalCollaborators((prev) =>
        prev.map((c) => (c.id === collaboratorId ? { ...c, role } : c))
      );
      bumpSync(collaboratorId, 1);

      const result = await updateCollaboratorRole(eventId, collaboratorId, role);
      bumpSync(collaboratorId, -1);

      if (result.error && before) {
        setLocalCollaborators((prev) =>
          prev.map((c) => (c.id === collaboratorId ? before : c))
        );
      }
      return result;
    },
    [eventId, localCollaborators, bumpSync]
  );

  const removeOptimistic = useCallback(
    async (collaboratorId: string) => {
      const before = localCollaborators.find((c) => c.id === collaboratorId);
      setLocalCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      bumpSync(collaboratorId, 1);

      const result = await removeCollaborator(eventId, collaboratorId);
      bumpSync(collaboratorId, -1);

      if (result.error && before) {
        setLocalCollaborators((prev) => [...prev, before]);
      }
      return result;
    },
    [eventId, localCollaborators, bumpSync]
  );

  const syncingCollaboratorIds = new Set(
    Object.entries(syncingCounts)
      .filter(([, count]) => count > 0)
      .map(([id]) => id)
  );

  return {
    members,
    localCollaborators,
    syncingCollaboratorIds,
    inviteOptimistic,
    updateRoleOptimistic,
    removeOptimistic,
  };
}
