"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Heart, Loader2, X } from "lucide-react";

import {
  acceptCollaboratorInvite,
  declineCollaboratorInvite,
} from "@/app/(dashboard)/dashboard/events/[id]/settings/collaborators/actions";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

type InviteAcceptClientProps = {
  token: string;
  eventTitle: string;
  role: string;
  email: string;
  isAuthenticated: boolean;
  emailMatches: boolean;
};

export function InviteAcceptClient({
  token,
  eventTitle,
  role,
  email,
  isAuthenticated,
  emailMatches,
}: InviteAcceptClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const handleAccept = async () => {
    setLoading("accept");
    setError(null);
    const result = await acceptCollaboratorInvite(token);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone("accepted");
    if (result.eventId) {
      router.refresh();
      setTimeout(() => router.push(`/dashboard/events/${result.eventId}`), 800);
    }
  };

  const handleDecline = async () => {
    setLoading("decline");
    setError(null);
    const result = await declineCollaboratorInvite(token);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone("declined");
  };

  if (done === "accepted") {
    return (
      <p className="text-center text-sm text-emerald-700 font-medium">
        {ro.collaboration.invite.acceptedRedirect}
      </p>
    );
  }

  if (done === "declined") {
    return (
      <p className="text-center text-sm text-text-secondary">
        {ro.collaboration.invite.declined}
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-text-secondary">{ro.collaboration.invite.loginRequired}</p>
        <Button asChild>
          <Link href={`/login`}>{ro.auth.signIn}</Link>
        </Button>
      </div>
    );
  }

  if (!emailMatches) {
    return (
      <p className="text-center text-sm text-amber-800">
        {ro.collaboration.invite.wrongEmail(email)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[#FEF8F9] border border-[#FCEAEF] px-4 py-3 text-sm text-text-secondary space-y-1">
        <p>
          <span className="font-semibold text-[#1A0E14]">{eventTitle}</span>
        </p>
        <p>
          {ro.collaboration.invite.roleLabel}{" "}
          <span className="font-medium text-[#B8516B]">{role}</span>
        </p>
      </div>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 min-h-[48px]"
          onClick={handleAccept}
          disabled={loading !== null}
        >
          {loading === "accept" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {ro.collaboration.invite.accept}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 min-h-[48px]"
          onClick={handleDecline}
          disabled={loading !== null}
        >
          {loading === "decline" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          {ro.collaboration.invite.decline}
        </Button>
      </div>
    </div>
  );
}

export function InvitePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FEF8F9] via-white to-[#FFF5F7] px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-[#1A0E14]">
        <Heart className="h-6 w-6 fill-[#FCEAEF] text-[#B8516B]" />
        <span className="font-serif text-2xl font-semibold">Evento</span>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-[rgba(210,170,185,0.25)] bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
