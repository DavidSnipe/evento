"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, Search } from "lucide-react";

import {
  loadPublicRsvpHousehold,
  searchPublicRsvpHouseholds,
  submitPublicHouseholdRsvp,
  type PublicRsvpMemberInput,
} from "@/lib/rsvp/public-actions";
import type { PublicInvitationView } from "@/lib/invitation/resolve-invitation";
import { PublicRsvpSuccess } from "@/components/rsvp/public-rsvp-success";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { InvitationHouseholdBundle } from "@/types/rsvp";
import type { PublicHouseholdSearchHit } from "@/lib/rsvp/public-queries";
import type { RsvpAttendanceStatus } from "@/types/rsvp";

type Step = "search" | "form" | "done";

const PUBLIC_ATTENDANCE: RsvpAttendanceStatus[] = [
  "confirmed",
  "maybe",
  "declined",
];

type MemberFormState = {
  memberId: string;
  displayName: string;
  attendance_status: RsvpAttendanceStatus;
  attending_civil: boolean;
  attending_religious: boolean;
  attending_party: boolean;
  menu_choice: string;
  allergies: string;
  notes: string;
};

type PublicRsvpFlowProps = {
  rsvpSlug: string;
  invitation: PublicInvitationView;
};

export function PublicRsvpFlow({ rsvpSlug, invitation }: PublicRsvpFlowProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicHouseholdSearchHit[]>([]);
  const [bundle, setBundle] = useState<InvitationHouseholdBundle | null>(null);
  const [members, setMembers] = useState<MemberFormState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const t = ro.rsvp.public;
  const attendanceLabel = (s: RsvpAttendanceStatus) => {
    const map = t.attendance as Record<string, string>;
    return map[s] ?? s;
  };

  const runSearch = useCallback(
    (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const res = await searchPublicRsvpHouseholds(rsvpSlug, q);
        if (res.error) setError(res.error);
        else setError(null);
        setResults(res.results);
      });
    },
    [rsvpSlug]
  );

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const scrollToSection = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectHousehold = (householdId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await loadPublicRsvpHousehold(rsvpSlug, householdId);
      if (res.error || !res.bundle) {
        setError(res.error ?? "Grup negăsit.");
        return;
      }
      setBundle(res.bundle);
      setMembers(
        res.bundle.members.map((m) => ({
          memberId: m.id,
          displayName: m.display_name,
          attendance_status:
            m.rsvp_response?.attendance_status === "pending"
              ? "confirmed"
              : (m.rsvp_response?.attendance_status ?? "confirmed"),
          attending_civil: m.rsvp_response?.attending_civil ?? true,
          attending_religious: m.rsvp_response?.attending_religious ?? true,
          attending_party: m.rsvp_response?.attending_party ?? true,
          menu_choice: m.rsvp_response?.menu_choice ?? "",
          allergies: m.rsvp_response?.allergies ?? "",
          notes: m.rsvp_response?.notes ?? "",
        }))
      );
      setStep("form");
      scrollToSection();
    });
  };

  const updateMember = (
    memberId: string,
    patch: Partial<MemberFormState>
  ) => {
    setMembers((prev) =>
      prev.map((m) => (m.memberId === memberId ? { ...m, ...patch } : m))
    );
  };

  const handleSubmit = () => {
    if (!bundle) return;
    setError(null);
    const payload: PublicRsvpMemberInput[] = members.map((m) => ({
      memberId: m.memberId,
      attendance_status: m.attendance_status,
      attending_civil: invitation.showCeremonyToggles ? m.attending_civil : false,
      attending_religious: invitation.showCeremonyToggles
        ? m.attending_religious
        : false,
      attending_party: invitation.showCeremonyToggles ? m.attending_party : false,
      menu_choice: m.menu_choice,
      allergies: m.allergies,
      notes: m.notes,
    }));

    startTransition(async () => {
      const res = await submitPublicHouseholdRsvp(
        rsvpSlug,
        bundle.id,
        payload
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setStep("done");
      scrollToSection();
    });
  };

  const resetToSearch = () => {
    setStep("search");
    setBundle(null);
    setQuery("");
    setResults([]);
    scrollToSection();
  };

  if (step === "done" && bundle) {
    return (
      <section ref={sectionRef} id="rsvp" className="scroll-mt-6">
        <PublicRsvpSuccess
          invitation={invitation}
          householdName={bundle.display_name}
          onEdit={() => {
            setStep("form");
            scrollToSection();
          }}
        />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="rsvp"
      className="scroll-mt-6 rounded-3xl border border-[#FCEAEF]/60 bg-white/80 p-5 shadow-[0_8px_32px_rgba(180,100,120,0.08)] backdrop-blur-sm sm:p-6"
    >
      <header className="mb-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
          RSVP
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-[#1A0E14]">
          {t.welcome}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">{t.searchHint}</p>
      </header>

      {step === "search" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div>
            <label
              htmlFor="rsvp-search"
              className="text-xs font-semibold uppercase tracking-wide text-text-subtle"
            >
              {t.searchLabel}
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <Input
                id="rsvp-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-12 rounded-2xl border-[#FCEAEF] bg-[#FDFBF7] pl-11 text-base"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
          </div>

          {results.length > 1 && (
            <p className="rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-900">
              {t.duplicateHint}
            </p>
          )}

          {query.length >= 2 && results.length === 0 && !isPending && (
            <p className="py-6 text-center text-sm text-text-secondary">
              {t.noResults}
            </p>
          )}

          {isPending && query.length >= 2 && (
            <p className="py-4 text-center text-xs text-text-subtle">
              {t.searching}
            </p>
          )}

          <ul className="space-y-2" role="listbox" aria-label={t.selectGroup}>
            {results.map((hit) => (
              <li key={hit.householdId}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => selectHousehold(hit.householdId)}
                  className={cn(
                    "flex w-full min-h-[56px] items-center gap-3 rounded-2xl border border-[#FCEAEF]/50",
                    "bg-white px-4 py-3.5 text-left transition-colors",
                    "hover:border-[#FCEAEF] hover:bg-[#FEF8F9] active:scale-[0.99]",
                    "disabled:opacity-60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1A0E14]">
                      {hit.displayName}
                    </p>
                    {hit.memberPreview && (
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {hit.memberPreview} · {hit.memberCount} {t.members}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#B8516B]/60" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "form" && bundle && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="text-center border-b border-[#FCEAEF]/50 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
              {t.yourGroup}
            </p>
            <h3 className="mt-1 font-serif text-lg font-semibold text-[#1A0E14]">
              {bundle.display_name}
            </h3>
          </div>

          {members.map((m) => (
            <article
              key={m.memberId}
              className="space-y-4 rounded-2xl border border-[#FCEAEF]/40 bg-[#FDFBF7]/80 p-4"
            >
              <p className="font-semibold text-[#1A0E14]">{m.displayName}</p>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-text-subtle">
                  {t.attending}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {PUBLIC_ATTENDANCE.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        updateMember(m.memberId, { attendance_status: s })
                      }
                      className={cn(
                        "min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors",
                        m.attendance_status === s
                          ? s === "declined"
                            ? "border-slate-300 bg-slate-100 text-slate-700"
                            : "border-[#FCEAEF] bg-[#FEF0F3] text-[#B8516B]"
                          : "border-slate-200/80 bg-white text-text-secondary"
                      )}
                    >
                      {attendanceLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              {invitation.showCeremonyToggles &&
                m.attendance_status !== "declined" && (
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ["attending_civil", t.civil],
                        ["attending_religious", t.religious],
                        ["attending_party", t.party],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200/60 bg-white px-3"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-[#B8516B]"
                          checked={m[key]}
                          onChange={(e) =>
                            updateMember(m.memberId, { [key]: e.target.checked })
                          }
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                )}

              {m.attendance_status !== "declined" && (
                <>
                  <Input
                    placeholder={t.menu}
                    value={m.menu_choice}
                    onChange={(e) =>
                      updateMember(m.memberId, { menu_choice: e.target.value })
                    }
                    className="h-11 rounded-xl text-sm"
                  />
                  <Input
                    placeholder={t.allergies}
                    value={m.allergies}
                    onChange={(e) =>
                      updateMember(m.memberId, { allergies: e.target.value })
                    }
                    className="h-11 rounded-xl text-sm"
                  />
                  <textarea
                    placeholder={t.notes}
                    value={m.notes}
                    onChange={(e) =>
                      updateMember(m.memberId, { notes: e.target.value })
                    }
                    rows={2}
                    className="w-full resize-none rounded-xl border border-input bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8516B]/15"
                  />
                </>
              )}
            </article>
          ))}

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] flex-1 rounded-2xl"
              onClick={resetToSearch}
              disabled={isPending}
            >
              {t.back}
            </Button>
            <Button
              type="button"
              className="min-h-[48px] flex-1 rounded-2xl"
              disabled={isPending}
              onClick={handleSubmit}
            >
              {isPending ? t.submitting : t.submit}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
