"use client";

import { format } from "date-fns";
import { ro as roLocale } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { EventFormState } from "@/app/(dashboard)/dashboard/events/actions";
import { EventTypePicker } from "@/components/events/event-type-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/types/events";

type EventFormProps = {
  mode: "create" | "edit";
  event?: EventRow;
  action: (prevState: EventFormState, formData: FormData) => Promise<EventFormState>;
  initialGodfatherName?: string;
  initialGodmotherName?: string;
};

const initialState: EventFormState = {};

const textareaClassName =
  "flex min-h-[100px] w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3.5 py-2.5 text-[12.5px] transition-all duration-200 ease-out placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#B8516B]/10 focus-visible:border-[#B8516B]/40 disabled:cursor-not-allowed disabled:opacity-50 text-[#1A0E14]";

export function EventForm({
  mode,
  event,
  action,
  initialGodfatherName = "",
  initialGodmotherName = "",
}: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isEdit = mode === "edit";
  
  const [date, setDate] = useState<Date | undefined>(
    event?.event_date ? new Date(event.event_date) : undefined
  );

  const [hasGodparents, setHasGodparents] = useState(
    !!initialGodfatherName || !!initialGodmotherName
  );

  return (
    <Card className="glass-panel border-0">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">{ro.events.form.title}</Label>
            <Input
              id="title"
              name="title"
              placeholder={ro.events.form.titlePlaceholder}
              defaultValue={event?.title ?? ""}
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label>{ro.events.form.type}</Label>
            <EventTypePicker defaultValue={event?.event_type ?? "wedding"} />
          </div>

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
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#F3F3F5] border-[rgba(210,170,185,0.25)] rounded-[10px] text-[12.5px] h-10 px-3.5 text-text-secondary hover:text-[#B8516B] active:scale-[0.99]",
                    !date && "text-text-subtle"
                  )}
                  disabled={pending}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-text-subtle" />
                  {date ? (
                    format(date, "PPP", { locale: roLocale })
                  ) : (
                    <span>Alege o dată</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={roLocale}
                />
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
              defaultValue={event?.venue ?? ""}
              disabled={pending}
            />
          </div>

          {/* Godparents Configuration Card */}
          <div className="space-y-4 rounded-[18px] border border-[rgba(210,170,185,0.22)] bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="has_godparents" className="text-sm font-bold text-[#1A0E14] cursor-pointer block">
                  Evenimentul are nași?
                </Label>
                <p className="text-[11px] text-text-secondary leading-normal">
                  Activează pentru a adăuga nașii ca invitați speciali (VIP).
                </p>
              </div>
              <input
                type="checkbox"
                id="has_godparents"
                name="has_godparents"
                checked={hasGodparents}
                onChange={(e) => setHasGodparents(e.target.checked)}
                disabled={pending}
                className="h-4.5 w-4.5 rounded border-[rgba(210,170,185,0.4)] text-[#B8516B] focus:ring-[#B8516B] accent-[#B8516B] cursor-pointer"
              />
            </div>

            {hasGodparents && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2 animate-fade-in-up duration-250">
                <div className="space-y-2">
                  <Label htmlFor="godfather_name">Nume Naș</Label>
                  <Input
                    id="godfather_name"
                    name="godfather_name"
                    placeholder="Ex: Bogdan Popescu"
                    defaultValue={initialGodfatherName}
                    required={hasGodparents}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="godmother_name">Nume Nașă</Label>
                  <Input
                    id="godmother_name"
                    name="godmother_name"
                    placeholder="Ex: Maria Popescu"
                    defaultValue={initialGodmotherName}
                    required={hasGodparents}
                    disabled={pending}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{ro.events.form.description}</Label>
            <textarea
              id="description"
              name="description"
              className={textareaClassName}
              placeholder={ro.events.form.descriptionPlaceholder}
              defaultValue={event?.description ?? ""}
              disabled={pending}
            />
          </div>

          {state.error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <Button type="submit" disabled={pending} className="sm:flex-1">
              {pending
                ? ro.auth.pleaseWait
                : isEdit
                  ? ro.events.form.save
                  : ro.events.form.create}
            </Button>
            <Button type="button" variant="outline" asChild className="sm:flex-1" disabled={pending}>
              <Link href={isEdit && event ? `/dashboard/events/${event.id}` : "/dashboard/events"}>
                {ro.events.form.cancel}
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
