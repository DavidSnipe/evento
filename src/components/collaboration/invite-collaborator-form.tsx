"use client";

import { useState } from "react";
import { Copy, Loader2, Mail, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import type { CollaboratorRole } from "@/types/collaboration";
import { COLLABORATOR_ROLES } from "@/types/collaboration";

type InviteCollaboratorFormProps = {
  onInvite: (
    email: string,
    role: CollaboratorRole
  ) => Promise<{ error?: string; inviteUrl?: string }>;
};

export function InviteCollaboratorForm({ onInvite }: InviteCollaboratorFormProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInviteUrl(null);

    const result = await onInvite(email, role);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.inviteUrl) setInviteUrl(result.inviteUrl);
    setEmail("");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {!open ? (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {ro.collaboration.actions.invite}
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[rgba(210,170,185,0.25)] bg-white p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-[#1A0E14]">
              {ro.collaboration.form.title}
            </h3>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-lg p-1.5 text-text-subtle hover:bg-[#FEF0F3]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ro.collaboration.form.emailPlaceholder}
                className="pl-9"
                required
                autoFocus
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              className="flex h-10 rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-sm sm:min-w-[160px]"
            >
              {COLLABORATOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ro.collaboration.roles[r]}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-text-secondary">{ro.collaboration.rolesHint[role]}</p>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              ro.collaboration.form.send
            )}
          </Button>
        </form>
      )}

      {inviteUrl && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-xs text-emerald-900 flex-1 break-all">{inviteUrl}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
          >
            <Copy className="h-3.5 w-3.5" />
            {ro.collaboration.actions.copyLink}
          </Button>
        </div>
      )}
    </div>
  );
}
