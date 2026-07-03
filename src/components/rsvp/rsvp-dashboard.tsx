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
import { StatsCard } from "@/components/nuntiki/stats-card";
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

  const publicPath = rsvpSlug ? `/rsvp/${rsvpSlug}` : null;

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
    if (!publicPath) return;
    const absoluteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${publicPath}`
        : publicPath;
    void navigator.clipboard.writeText(absoluteUrl).then(() => {
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    });
  };

  const needsHouseholdSync = stats.householdCount === 0;

  return (
    <div className="space-y-6">
      {needsHouseholdSync ? (
        <div
          className="rounded-[14px] border border-amber-300/80 bg-amber-50 px-4 py-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">{ro.rsvp.prep.syncRequiredTitle}</p>
          <p className="mt-1.5 text-amber-900/90">{ro.rsvp.prep.syncRequiredBody}</p>
          <Button
            type="button"
            className="mt-3 min-h-11 rounded-xl"
            disabled={isPending}
            onClick={handleSync}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
            {ro.rsvp.prep.syncRequiredCta}
          </Button>
        </div>
      ) : null}

      <Card className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--dash-hairline)] bg-[var(--dash-accent-soft)]">
              <Sparkles className="h-4 w-4 text-[var(--dash-accent-text)]" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">{ro.rsvp.invitation.title}</CardTitle>
              <CardDescription className="mt-1">{ro.rsvp.invitation.desc}</CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="h-11 min-h-11 rounded-xl" asChild>
                  <Link href={`/dashboard/events/${eventId}/rsvp/invitation`}>
                    {ro.rsvp.invitation.edit}
                  </Link>
                </Button>
                {rsvpSlug && (
                  <Button size="sm" variant="outline" className="h-11 min-h-11 rounded-xl" asChild>
                    <Link href={`/rsvp/${rsvpSlug}`} target="_blank">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
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
        <Card className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-[var(--dash-accent-text)]" />
              {ro.rsvp.publicLink.title}
            </CardTitle>
            <CardDescription>{ro.rsvp.publicLink.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rsvpSlug && publicPath ? (
              <>
                <p className="break-all rounded-lg border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-3 py-2 font-mono text-xs text-[var(--dash-text-secondary)]">
                  {publicPath}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-1.5 rounded-lg"
                    disabled={needsHouseholdSync}
                    onClick={handleCopy}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copyOk ? ro.rsvp.publicLink.copied : ro.rsvp.publicLink.copy}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-1.5 rounded-lg"
                    asChild
                  >
                    <a href={publicPath} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {ro.rsvp.publicLink.preview}
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--dash-text-secondary)]">{ro.rsvp.publicLink.notActive}</p>
                <Button
                  type="button"
                  className="min-h-11 rounded-xl"
                  disabled={isPending}
                  onClick={handleActivate}
                >
                  {ro.rsvp.publicLink.activate}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-[var(--dash-accent-text)]" />
              {ro.rsvp.prep.title}
            </CardTitle>
            <CardDescription>{ro.rsvp.prep.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!needsHouseholdSync ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full gap-2 rounded-xl sm:w-auto"
                disabled={isPending}
                onClick={handleSync}
              >
                <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                {ro.rsvp.prep.sync}
              </Button>
            ) : null}
            {syncMsg && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {syncMsg}
              </p>
            )}
            <Button asChild variant="link" className="h-auto p-0 text-[var(--dash-accent-text)]">
              <Link href={`/dashboard/events/${eventId}/guests`}>
                Gestionează invitații →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: ro.rsvp.overview.households, value: stats.householdCount, accent: "default" as const },
          { label: ro.rsvp.overview.people, value: stats.memberCount, accent: "default" as const },
          { label: ro.rsvp.overview.confirmed, value: stats.confirmed, accent: "success" as const },
          { label: ro.rsvp.overview.pending, value: stats.pending, accent: "warning" as const },
        ].map((s) => (
          <StatsCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <Card className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">{ro.rsvp.responses.title}</CardTitle>
          <CardDescription>{eventTitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {households.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--dash-text-secondary)]">
              {ro.rsvp.responses.empty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--dash-hairline)] text-left text-[11px] uppercase tracking-wide text-[var(--dash-text-muted)]">
                    <th className="pb-2 pr-4">{ro.rsvp.responses.group}</th>
                    <th className="pb-2 pr-4">{ro.rsvp.responses.members}</th>
                    <th className="pb-2">{ro.rsvp.responses.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((h) => (
                    <tr key={h.id} className="border-b border-[var(--dash-hairline)]">
                      <td className="min-h-[56px] py-4 pr-4 font-medium">{h.display_name}</td>
                      <td className="min-h-[56px] py-4 pr-4 text-[var(--dash-text-secondary)]">
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
                      <td className="min-h-[56px] py-4">
                        <span className="text-xs font-semibold text-[var(--dash-accent-text)]">
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
