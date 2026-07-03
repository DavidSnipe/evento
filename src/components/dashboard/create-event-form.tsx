"use client";

import { format } from "date-fns";
import { ro as roLocale } from "date-fns/locale";
import { CalendarIcon, Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";

import type { EventFormState } from "@/app/(dashboard)/dashboard/events/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createEventTypeOptions } from "@/lib/events/config";
import { buildEventTitleFromForm } from "@/lib/events/event-title";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { EventType } from "@/types";
import { isBaptismType, isWeddingType, usesGodparentsAtCreate, usesSmartNameFields } from "@/types/events";

type CreateEventFormProps = {
  action: (prevState: EventFormState, formData: FormData) => Promise<EventFormState>;
};

const initialState: EventFormState = {};

export function CreateEventForm({ action }: CreateEventFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState<Date | undefined>();

  const [groomFirstName, setGroomFirstName] = useState("");
  const [groomLastName, setGroomLastName] = useState("");
  const [brideFirstName, setBrideFirstName] = useState("");
  const [brideLastName, setBrideLastName] = useState("");
  const brideLastAutoFilled = useRef(true);

  const [motherFirstName, setMotherFirstName] = useState("");
  const [fatherFirstName, setFatherFirstName] = useState("");
  const [familyLastName, setFamilyLastName] = useState("");
  const [babyFirstName, setBabyFirstName] = useState("");

  const [manualTitle, setManualTitle] = useState("");

  const titlePreview = useMemo(() => {
    if (!eventType) return "";
    if (usesSmartNameFields(eventType)) {
      return buildEventTitleFromForm(eventType, {
        groomFirstName,
        brideFirstName,
        parent1FirstName: motherFirstName,
        parent2FirstName: fatherFirstName,
        parentLastName: familyLastName,
        babyFirstName,
      });
    }
    return manualTitle.trim();
  }, [
    eventType,
    groomFirstName,
    brideFirstName,
    motherFirstName,
    fatherFirstName,
    familyLastName,
    babyFirstName,
    manualTitle,
  ]);

  const showDifferentLastNamesWarning =
    eventType &&
    isWeddingType(eventType) &&
    groomLastName.trim().length > 0 &&
    brideLastName.trim().length > 0 &&
    groomLastName.trim() !== brideLastName.trim();

  const handleGroomLastNameBlur = () => {
    if (!groomLastName.trim()) return;
    if (brideLastAutoFilled.current || !brideLastName.trim()) {
      setBrideLastName(groomLastName);
      brideLastAutoFilled.current = true;
    }
  };

  const handleBrideLastNameChange = (value: string) => {
    brideLastAutoFilled.current = false;
    setBrideLastName(value);
  };

  return (
    <Card className="glass-panel border-0">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-8">
          <section className="space-y-3">
            <div>
              <Label>{ro.events.form.type}</Label>
              <p className="mt-1 text-[11px] text-text-subtle">{ro.events.form.chooseTypeHint}</p>
            </div>
            <input type="hidden" name="event_type" value={eventType ?? ""} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {createEventTypeOptions.map((option) => {
                const isSelected = eventType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEventType(option.value)}
                    className={cn(
                      "relative flex min-h-[88px] items-center gap-4 rounded-[14px] border p-4 text-left transition-all duration-200 active:scale-[0.99]",
                      isSelected
                        ? "border-[#B8516B] bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] shadow-[0_2px_8px_rgba(180,100,120,0.08)]"
                        : "border-[rgba(210,170,185,0.22)] bg-white hover:border-[#B8516B]/40"
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {option.emoji}
                    </span>
                    <span className="text-sm font-semibold text-[#1A0E14]">{option.label}</span>
                    {isSelected ? (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#B8516B] text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {eventType && isWeddingType(eventType) ? (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4 rounded-[16px] border border-[rgba(210,170,185,0.22)] bg-white/80 p-5">
                <h3 className="text-sm font-bold text-[#1A0E14]">{ro.events.form.groomSection}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="groom_first_name">{ro.events.form.groomFirstName}</Label>
                    <Input
                      id="groom_first_name"
                      name="groom_first_name"
                      value={groomFirstName}
                      onChange={(e) => setGroomFirstName(e.target.value)}
                      required
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groom_last_name">{ro.events.form.groomLastName}</Label>
                    <Input
                      id="groom_last_name"
                      name="groom_last_name"
                      value={groomLastName}
                      onChange={(e) => setGroomLastName(e.target.value)}
                      onBlur={handleGroomLastNameBlur}
                      required
                      disabled={pending}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[16px] border border-[rgba(210,170,185,0.22)] bg-white/80 p-5">
                <h3 className="text-sm font-bold text-[#1A0E14]">{ro.events.form.brideSection}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bride_first_name">{ro.events.form.brideFirstName}</Label>
                    <Input
                      id="bride_first_name"
                      name="bride_first_name"
                      value={brideFirstName}
                      onChange={(e) => setBrideFirstName(e.target.value)}
                      required
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bride_last_name">{ro.events.form.brideLastName}</Label>
                    <Input
                      id="bride_last_name"
                      name="bride_last_name"
                      value={brideLastName}
                      onChange={(e) => handleBrideLastNameChange(e.target.value)}
                      required
                      disabled={pending}
                    />
                    {showDifferentLastNamesWarning ? (
                      <p className="text-[11px] text-amber-600">
                        ⚠️ {ro.events.form.differentLastNames}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {titlePreview ? (
                <div className="rounded-[12px] border border-dashed border-[#B8516B]/30 bg-[#FEF0F3]/50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                    {ro.events.form.titlePreview}
                  </p>
                  <p className="mt-1 font-serif text-lg font-semibold text-[#1A0E14]">{titlePreview}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {eventType && isBaptismType(eventType) ? (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4 rounded-[16px] border border-[rgba(210,170,185,0.22)] bg-white/80 p-5">
                <h3 className="text-sm font-bold text-[#1A0E14]">{ro.events.form.parentsSection}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="parent1_first_name">{ro.events.form.motherFirstName}</Label>
                    <Input
                      id="parent1_first_name"
                      name="parent1_first_name"
                      value={motherFirstName}
                      onChange={(e) => setMotherFirstName(e.target.value)}
                      required
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent2_first_name">{ro.events.form.fatherFirstName}</Label>
                    <Input
                      id="parent2_first_name"
                      name="parent2_first_name"
                      value={fatherFirstName}
                      onChange={(e) => setFatherFirstName(e.target.value)}
                      required
                      disabled={pending}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="family_last_name">{ro.events.form.familyLastName}</Label>
                  <Input
                    id="family_last_name"
                    name="parent1_last_name"
                    value={familyLastName}
                    onChange={(e) => setFamilyLastName(e.target.value)}
                    required
                    disabled={pending}
                  />
                  <input type="hidden" name="parent2_last_name" value={familyLastName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baby_first_name">{ro.events.form.babyFirstName}</Label>
                  <Input
                    id="baby_first_name"
                    name="baby_first_name"
                    value={babyFirstName}
                    onChange={(e) => setBabyFirstName(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              {titlePreview ? (
                <div className="rounded-[12px] border border-dashed border-[#B8516B]/30 bg-[#FEF0F3]/50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                    {ro.events.form.titlePreview}
                  </p>
                  <p className="mt-1 font-serif text-lg font-semibold text-[#1A0E14]">{titlePreview}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {eventType && !usesSmartNameFields(eventType) ? (
            <section className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Label htmlFor="title">{ro.events.form.title}</Label>
              <Input
                id="title"
                name="title"
                placeholder={ro.events.form.titlePlaceholder}
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                required
                disabled={pending}
              />
            </section>
          ) : null}

          {eventType ? (
            <section className="space-y-6 border-t border-[rgba(210,170,185,0.18)] pt-6 animate-in fade-in duration-300">
              <div className="space-y-2 flex flex-col">
                <Label className="mb-2">{ro.events.form.date}</Label>
                <input
                  type="hidden"
                  name="event_date"
                  value={date ? format(date, "yyyy-MM-dd") : ""}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-[#F3F3F5] border-[rgba(210,170,185,0.25)] rounded-[10px] text-[12.5px] h-10 px-3.5 text-text-secondary hover:text-[#B8516B] active:scale-[0.99]",
                        !date && "text-text-subtle"
                      )}
                      disabled={pending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-text-subtle" />
                      {date ? format(date, "PPP", { locale: roLocale }) : <span>Alege o dată</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={roLocale} />
                  </PopoverContent>
                </Popover>
                <p className="text-[10px] text-text-subtle mt-1.5">{ro.events.form.dateHint}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">{ro.events.form.venue}</Label>
                <Input
                  id="venue"
                  name="venue"
                  placeholder={ro.events.form.venuePlaceholder}
                  disabled={pending}
                />
                <p className="text-[10px] text-text-subtle">{ro.events.form.venueOptionalHint}</p>
              </div>

              {usesGodparentsAtCreate(eventType) ? (
                <div className="space-y-4 rounded-[16px] border border-[rgba(210,170,185,0.22)] bg-white/80 p-5">
                  <h3 className="text-sm font-bold text-[#1A0E14]">{ro.events.form.godparentsSection}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="godfather_name">{ro.events.form.godfatherFirstName}</Label>
                      <Input
                        id="godfather_name"
                        name="godfather_name"
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="godmother_name">{ro.events.form.godmotherFirstName}</Label>
                      <Input
                        id="godmother_name"
                        name="godmother_name"
                        disabled={pending}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {state.error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <Button type="submit" disabled={pending || !eventType} className="sm:flex-1">
              {pending ? ro.auth.pleaseWait : ro.events.form.create}
            </Button>
            <Button type="button" variant="outline" asChild className="sm:flex-1" disabled={pending}>
              <Link href="/dashboard/events">{ro.events.form.cancel}</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
