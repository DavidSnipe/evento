"use client";

import { useActionState, useEffect } from "react";

import type { GuestFormState } from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import type { GuestRow } from "@/types/guests";
import type { SeatingTableRow } from "@/types/guests";
import { RSVP_STATUSES } from "@/types/guests";

const selectClass =
  "flex h-10 w-full rounded-[10px] border border-[#d2aaa9]/20 bg-[#F3F3F5] px-3.5 text-xs font-semibold text-text-secondary outline-none focus:bg-[#FEF0F3]/20 focus:border-[#B8516B]/50 transition-all cursor-pointer";

type GuestFormProps = {
  eventId: string;
  tables: SeatingTableRow[];
  guest?: GuestRow;
  action: (
    prev: GuestFormState,
    formData: FormData
  ) => Promise<GuestFormState>;
  onSuccess?: () => void;
  title: string;
};

const initialState: GuestFormState = {};

export function GuestForm({
  eventId,
  tables,
  guest,
  action,
  onSuccess,
  title,
}: GuestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isEdit = Boolean(guest);

  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  return (
    <Card className="glass-panel border-0 bg-white/70 shadow-card rounded-[18px]">
      <CardHeader className="pb-4">
        <CardTitle className="font-serif text-lg font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="event_id" value={eventId} />
          
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="first_name" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.firstName} *
            </Label>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={guest?.first_name ?? ""}
              required
            />
          </div>
          
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="last_name" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.lastName}
            </Label>
            <Input id="last_name" name="last_name" defaultValue={guest?.last_name ?? ""} />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.email}
            </Label>
            <Input id="email" name="email" type="email" defaultValue={guest?.email ?? ""} />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.phone}
            </Label>
            <Input id="phone" name="phone" defaultValue={guest?.phone ?? ""} />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="rsvp_status" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.rsvpStatus}
            </Label>
            <select
              id="rsvp_status"
              name="rsvp_status"
              className={selectClass}
              defaultValue={guest?.rsvp_status ?? "pending"}
            >
              {RSVP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ro.guests.rsvp[s]}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="table_id" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.table}
            </Label>
            <select
              id="table_id"
              name="table_id"
              className={selectClass}
              defaultValue={guest?.table_id ?? ""}
            >
              <option value="">{ro.guests.form.noTable}</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="group_name" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.group}
            </Label>
            <Input
              id="group_name"
              name="group_name"
              placeholder={ro.guests.form.groupPlaceholder}
              defaultValue={guest?.group_name ?? ""}
            />
          </div>
          
          <div className="flex items-center gap-2 sm:col-span-2 py-1.5">
            <input
              type="checkbox"
              id="plus_one"
              name="plus_one"
              defaultChecked={guest?.plus_one ?? false}
              className="h-4 w-4 rounded border-[#D2AAA9]/40 text-[#B8516B] accent-[#B8516B] focus:ring-[#B8516B]/20 cursor-pointer"
            />
            <Label htmlFor="plus_one" className="cursor-pointer text-xs font-semibold text-text-secondary">
              {ro.guests.form.plusOne}
            </Label>
          </div>
          
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plus_one_name" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.plusOneName}
            </Label>
            <Input
              id="plus_one_name"
              name="plus_one_name"
              defaultValue={guest?.plus_one_name ?? ""}
            />
          </div>
          
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dietary_notes" className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {ro.guests.form.dietary}
            </Label>
            <Input
              id="dietary_notes"
              name="dietary_notes"
              defaultValue={guest?.dietary_notes ?? ""}
            />
          </div>

          {state.error ? (
            <p className="sm:col-span-2 rounded-[10px] bg-red-50 border border-red-100 px-3.5 py-2.5 text-xs font-semibold text-[#FF3B30]">
              {state.error}
            </p>
          ) : null}

          <div className="sm:col-span-2 mt-4">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? ro.auth.pleaseWait : isEdit ? ro.guests.form.save : ro.guests.form.add}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
