"use client";

import { Copy, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type {
  CollaboratorRole,
  EventCollaboratorRow,
  EventMemberView,
  EventOwnerView,
} from "@/types/collaboration";
import { COLLABORATOR_ROLES } from "@/types/collaboration";

type CollaboratorRowProps = {
  member: EventMemberView;
  inviteBaseUrl: string;
  syncing?: boolean;
  canManage: boolean;
  onRoleChange?: (id: string, role: CollaboratorRole) => void;
  onRemove?: (id: string) => void;
};

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-slate-100 text-slate-500",
};

export function CollaboratorRow({
  member,
  inviteBaseUrl,
  syncing,
  canManage,
  onRoleChange,
  onRemove,
}: CollaboratorRowProps) {
  const isOwner = member.isOwner === true;
  const collaborator = !isOwner ? (member as EventCollaboratorRow) : null;
  const inviteUrl =
    collaborator?.status === "pending"
      ? `${inviteBaseUrl}/invite/${collaborator.invite_token}`
      : null;

  const role = isOwner ? "owner" : collaborator!.role;
  const status = isOwner ? "accepted" : collaborator!.status;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[rgba(210,170,185,0.2)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between",
        syncing && "opacity-70"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-[#1A0E14] truncate">{member.email}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              STATUS_STYLES[status as keyof typeof STATUS_STYLES]
            )}
          >
            {ro.collaboration.status[status as keyof typeof ro.collaboration.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {ro.collaboration.roles[isOwner ? "owner" : role]}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManage && !isOwner && collaborator && (
          <>
            <select
              value={collaborator.role}
              disabled={syncing || collaborator.status !== "accepted"}
              onChange={(e) =>
                onRoleChange?.(collaborator.id, e.target.value as CollaboratorRole)
              }
              className="h-9 rounded-lg border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-2.5 text-xs disabled:opacity-50"
            >
              {COLLABORATOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ro.collaboration.roles[r]}
                </option>
              ))}
            </select>

            {inviteUrl && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
              >
                <Copy className="h-3.5 w-3.5" />
                {ro.collaboration.actions.copyLink}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={syncing}
              onClick={() => onRemove?.(collaborator.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        )}

        {isOwner && (
          <span className="text-xs font-semibold text-[#B8516B]">
            {(member as EventOwnerView).isOwner && ro.collaboration.ownerBadge}
          </span>
        )}
      </div>
    </div>
  );
}
