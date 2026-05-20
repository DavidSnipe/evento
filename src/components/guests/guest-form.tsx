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
  "flex h-11 w-full rounded-xl border border-input bg-background/80 px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="event_id" value={eventId} />
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="first_name">{ro.guests.form.firstName} *</Label>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={guest?.first_name ?? ""}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="last_name">{ro.guests.form.lastName}</Label>
            <Input id="last_name" name="last_name" defaultValue={guest?.last_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{ro.guests.form.email}</Label>
            <Input id="email" name="email" type="email" defaultValue={guest?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{ro.guests.form.phone}</Label>
            <Input id="phone" name="phone" defaultValue={guest?.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsvp_status">{ro.guests.form.rsvpStatus}</Label>
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
          <div className="space-y-2">
            <Label htmlFor="table_id">{ro.guests.form.table}</Label>
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="group_name">{ro.guests.form.group}</Label>
            <Input
              id="group_name"
              name="group_name"
              placeholder={ro.guests.form.groupPlaceholder}
              defaultValue={guest?.group_name ?? ""}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="plus_one"
              name="plus_one"
              defaultChecked={guest?.plus_one ?? false}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="plus_one" className="cursor-pointer font-normal">
              {ro.guests.form.plusOne}
            </Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="plus_one_name">{ro.guests.form.plusOneName}</Label>
            <Input
              id="plus_one_name"
              name="plus_one_name"
              defaultValue={guest?.plus_one_name ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dietary_notes">{ro.guests.form.dietary}</Label>
            <Input
              id="dietary_notes"
              name="dietary_notes"
              defaultValue={guest?.dietary_notes ?? ""}
            />
          </div>

          {state.error ? (
            <p className="sm:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? ro.auth.pleaseWait : isEdit ? ro.guests.form.save : ro.guests.form.add}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
