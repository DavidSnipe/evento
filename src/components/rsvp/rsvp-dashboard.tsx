"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import {
  generateEventRsvpSlug,
  syncGuestsToRsvpGroups,
} from "@/app/(dashboard)/dashboard/events/[id]/rsvp/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { InvitationHouseholdBundle } from "@/types/rsvp";
import type { RsvpOverviewStats } from "@/lib/rsvp/public-queries";

type RsvpDashboardProps = {
  eventId: string;
  eventTitle: string;
  rsvpSlug: string | null;
  stats: RsvpOverviewStats;
  households: InvitationHouseholdBundle[];
};

function groupStatusLabel(household: InvitationHouseholdBundle): string {
  const statuses = household.members.map(
    (m) => m.rsvp_response?.attendance_status ?? "pending"
  );
  const answered = statuses.filter((s) => s !== "pending").length;
  if (answered === 0) return ro.rsvp.status.draft;
  if (answered < statuses.length) return ro.rsvp.status.partial;
  return ro.rsvp.status.completed;
}

export function RsvpDashboard({
  eventId,
  eventTitle,
  rsvpSlug,
  stats,
  households,
}: RsvpDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copyOk, setCopyOk] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const publicUrl =
    typeof window !== "undefined" && rsvpSlug
      ? `${window.location.origin}/rsvp/${rsvpSlug}`
      : rsvpSlug
        ? `/rsvp/${rsvpSlug}`
        : null;

  const handleActivate = () => {
    startTransition(async () => {
      await generateEventRsvpSlug(eventId);
      router.refresh();
    });
  };

  const handleSync = () => {
    setSyncMsg(null);
    startTransition(async () => {
      const res = await syncGuestsToRsvpGroups(eventId);
      if (res.error) setSyncMsg(res.error);
      else if (res.created != null)
        setSyncMsg(`${res.created} ${ro.rsvp.prep.syncDone}`);
      router.refresh();
    });
  };

  const handleCopy = () => {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl).then(() => {
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#FCEAEF]/80 bg-gradient-to-br from-[#FEF8F9] to-white">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEF0F3] border border-[#FCEAEF]">
              <Sparkles className="h-4 w-4 text-[#B8516B]" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{ro.rsvp.invitation.title}</CardTitle>
              <CardDescription className="mt-1">{ro.rsvp.invitation.desc}</CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-xl h-8" asChild>
                  <Link href={`/dashboard/events/${eventId}/rsvp/invitation`}>
                    {ro.rsvp.invitation.edit}
                  </Link>
                </Button>
                {rsvpSlug && (
                  <Button size="sm" variant="outline" className="rounded-xl h-8" asChild>
                    <Link href={`/rsvp/${rsvpSlug}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      {ro.rsvp.invitation.preview}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#B8516B]" />
              {ro.rsvp.publicLink.title}
            </CardTitle>
            <CardDescription>{ro.rsvp.publicLink.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rsvpSlug && publicUrl ? (
              <>
                <p className="text-xs font-mono text-text-secondary break-all bg-slate-50 rounded-lg px-3 py-2 border">
                  {publicUrl}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1.5"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copyOk ? ro.rsvp.publicLink.copied : ro.rsvp.publicLink.copy}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1.5"
                    asChild
                  >
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">{ro.rsvp.publicLink.notActive}</p>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={isPending}
                  onClick={handleActivate}
                >
                  {ro.rsvp.publicLink.activate}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-[#B8516B]" />
              {ro.rsvp.prep.title}
            </CardTitle>
            <CardDescription>{ro.rsvp.prep.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2 w-full sm:w-auto"
              disabled={isPending}
              onClick={handleSync}
            >
              <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
              {ro.rsvp.prep.sync}
            </Button>
            {syncMsg && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                {syncMsg}
              </p>
            )}
            <Button asChild variant="link" className="h-auto p-0 text-[#B8516B]">
              <Link href={`/dashboard/events/${eventId}/guests`}>
                Gestionează invitații →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ro.rsvp.overview.households, value: stats.householdCount },
          { label: ro.rsvp.overview.people, value: stats.memberCount },
          { label: ro.rsvp.overview.confirmed, value: stats.confirmed },
          { label: ro.rsvp.overview.pending, value: stats.pending },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-bold text-[#1A0E14]">{s.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle mt-1">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ro.rsvp.responses.title}</CardTitle>
          <CardDescription>{eventTitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {households.length === 0 ? (
            <p className="text-sm text-text-secondary py-6 text-center">
              {ro.rsvp.responses.empty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-text-subtle">
                    <th className="pb-2 pr-4">{ro.rsvp.responses.group}</th>
                    <th className="pb-2 pr-4">{ro.rsvp.responses.members}</th>
                    <th className="pb-2">{ro.rsvp.responses.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((h) => (
                    <tr key={h.id} className="border-b border-border-rose-18/15">
                      <td className="py-3 pr-4 font-medium">{h.display_name}</td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {h.members.map((m) => {
                          const st = m.rsvp_response?.attendance_status ?? "pending";
                          const icon =
                            st === "confirmed"
                              ? "✓"
                              : st === "declined"
                                ? "✗"
                                : st === "maybe"
                                  ? "?"
                                  : "·";
                          return (
                            <span key={m.id} className="mr-2 inline-block">
                              {m.display_name}{" "}
                              <span className="text-[10px] opacity-60">{icon}</span>
                            </span>
                          );
                        })}
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-semibold text-[#B8516B]">
                          {groupStatusLabel(h)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
