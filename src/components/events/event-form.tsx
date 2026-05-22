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
  "flex min-h-[100px] w-full rounded-xl border border-input bg-background/80 px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

          <div className="space-y-2">
            <Label>{ro.events.form.date}</Label>
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
                    "w-full justify-start text-left font-normal bg-background/80",
                    !date && "text-muted-foreground"
                  )}
                  disabled={pending}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
            <p className="text-xs text-muted-foreground">{ro.events.form.dateHint}</p>
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
          <div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="has_godparents" className="text-base font-semibold cursor-pointer">
                  Evenimentul are nași?
                </Label>
                <p className="text-xs text-muted-foreground">
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
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary bg-background/80 accent-primary cursor-pointer"
              />
            </div>

            {hasGodparents && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-200">
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

          <div className="flex flex-col gap-3 sm:flex-row">
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
