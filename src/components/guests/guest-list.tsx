"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, UtensilsCrossed } from "lucide-react";

import {
  createGuest,
  deleteGuest,
  updateGuest,
  updateGuestRsvp,
} from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";
import { GuestForm } from "@/components/guests/guest-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { GuestWithTable, RsvpStatus, SeatingTableRow } from "@/types/guests";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm";

type GuestListProps = {
  eventId: string;
  guests: GuestWithTable[];
  tables: SeatingTableRow[];
  initialFilter?: RsvpStatus | "all";
};

const filters: { key: RsvpStatus | "all"; label: string }[] = [
  { key: "all", label: ro.guests.filters.all },
  { key: "pending", label: ro.guests.filters.pending },
  { key: "accepted", label: ro.guests.filters.accepted },
  { key: "declined", label: ro.guests.filters.declined },
  { key: "maybe", label: ro.guests.filters.maybe },
];

function guestName(g: GuestWithTable) {
  return [g.first_name, g.last_name].filter(Boolean).join(" ");
}

export function GuestList({
  eventId,
  guests,
  tables,
  initialFilter = "all",
}: GuestListProps) {
  const [filter, setFilter] = useState<RsvpStatus | "all">(initialFilter);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered =
    filter === "all" ? guests : guests.filter((g) => g.rsvp_status === filter);

  const editingGuest = guests.find((g) => g.id === editingId);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              filter === f.key
                ? "bg-primary/20 text-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!showAdd ? (
        <Button onClick={() => setShowAdd(true)}>{ro.guests.addGuest}</Button>
      ) : (
        <GuestForm
          eventId={eventId}
          tables={tables}
          title={ro.guests.addGuest}
          action={createGuest.bind(null, eventId)}
          onSuccess={() => setShowAdd(false)}
        />
      )}

      {editingGuest ? (
        <GuestForm
          eventId={eventId}
          tables={tables}
          guest={editingGuest}
          title={ro.guests.editGuest}
          action={updateGuest.bind(null, eventId, editingGuest.id)}
          onSuccess={() => setEditingId(null)}
        />
      ) : null}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            {ro.guests.emptyDesc}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">{ro.guests.table.name}</th>
                <th className="px-4 py-3 font-medium">{ro.guests.table.rsvp}</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  {ro.guests.table.group}
                </th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  {ro.guests.table.table}
                </th>
                <th className="px-4 py-3 font-medium">{ro.guests.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr key={guest.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{guestName(guest)}</p>
                    {guest.plus_one ? (
                      <p className="text-xs text-muted-foreground">
                        +1 {guest.plus_one_name ? `· ${guest.plus_one_name}` : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={selectClass}
                      defaultValue={guest.rsvp_status}
                      onChange={(e) =>
                        updateGuestRsvp(
                          eventId,
                          guest.id,
                          e.target.value as RsvpStatus
                        )
                      }
                    >
                      {(["pending", "accepted", "declined", "maybe"] as const).map((s) => (
                        <option key={s} value={s}>
                          {ro.guests.rsvp[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {guest.group_name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {guest.seating_tables?.name ? (
                      <Link
                        href={`/dashboard/events/${eventId}/seating`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        {guest.seating_tables.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(guest.id);
                          setShowAdd(false);
                        }}
                        title={ro.guests.table.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <form
                        action={deleteGuest.bind(null, eventId, guest.id)}
                        onSubmit={(e) => {
                          if (!confirm(ro.guests.table.deleteConfirm)) e.preventDefault();
                        }}
                      >
                        <Button type="submit" variant="ghost" size="icon" title={ro.guests.table.delete}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
