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
  "h-8 rounded-[8px] border border-[#d2aaa9]/20 bg-[#F3F3F5] px-2 text-xs font-semibold text-text-secondary outline-none focus:bg-[#FEF0F3]/20 focus:border-[#B8516B]/50 transition-all cursor-pointer";

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
  return g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
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
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-[20px] px-4 py-1.5 text-xs font-semibold tracking-wide transition-all border cursor-pointer",
              filter === f.key
                ? "bg-[#FEF0F3] border-[#FCEAEF] text-[#B8516B] shadow-[0_2px_8px_rgba(184,81,107,0.06)]"
                : "bg-[#F3F3F5] border-transparent text-text-secondary hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!showAdd ? (
        <Button onClick={() => {
          setShowAdd(true);
          setEditingId(null);
        }}>{ro.guests.addGuest}</Button>
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
        <div className="mt-4">
          <GuestForm
            eventId={eventId}
            tables={tables}
            guest={editingGuest}
            title={ro.guests.editGuest}
            action={updateGuest.bind(null, eventId, editingGuest.id)}
            onSuccess={() => setEditingId(null)}
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card className="border-dashed border-border-rose-18/30 bg-white/40 rounded-[18px]">
          <CardContent className="py-12 text-center text-xs font-semibold text-text-subtle">
            {ro.guests.emptyDesc}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-rose-18/30 bg-[#F3F3F5]/40 text-left text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
                <th className="px-4 py-3 border-r border-border-rose-18/20 last:border-0">{ro.guests.table.name}</th>
                <th className="px-4 py-3 border-r border-border-rose-18/20 last:border-0">{ro.guests.table.rsvp}</th>
                <th className="hidden px-4 py-3 border-r border-border-rose-18/20 last:border-0 md:table-cell">
                  {ro.guests.table.group}
                </th>
                <th className="hidden px-4 py-3 border-r border-border-rose-18/20 last:border-0 sm:table-cell">
                  {ro.guests.table.table}
                </th>
                <th className="px-4 py-3">{ro.guests.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-rose-18/20">
              {filtered.map((guest) => (
                <tr key={guest.id} className="hover:bg-[#FEF0F3]/15 transition-all duration-200">
                  <td className="px-4 py-3 border-r border-border-rose-18/20 last:border-0">
                    <p className="text-xs font-bold text-foreground">{guestName(guest)}</p>
                    {guest.plus_one ? (
                      <p className="text-[10px] font-medium text-text-secondary mt-0.5">
                        +1 {guest.plus_one_name ? `· ${guest.plus_one_name}` : "Partener"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 border-r border-border-rose-18/20 last:border-0">
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
                  <td className="hidden px-4 py-3 text-xs font-semibold text-text-secondary md:table-cell border-r border-border-rose-18/20 last:border-0">
                    {guest.group_name ?? <span className="text-text-faint/65">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell border-r border-border-rose-18/20 last:border-0">
                    {guest.seating_tables?.name ? (
                      <Link
                        href={`/dashboard/events/${eventId}/seating`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8516B] hover:text-[#AA3F58] hover:underline"
                      >
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        {guest.seating_tables.name}
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(guest.id);
                          setShowAdd(false);
                        }}
                        title={ro.guests.table.edit}
                        className="h-8 w-8 text-text-secondary hover:text-[#B8516B] hover:bg-[#FEF0F3] rounded-[8px]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <form
                        action={deleteGuest.bind(null, eventId, guest.id)}
                        onSubmit={(e) => {
                          if (!confirm(ro.guests.table.deleteConfirm)) e.preventDefault();
                        }}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          title={ro.guests.table.delete}
                          className="h-8 w-8 text-text-secondary hover:text-[#FF3B30] hover:bg-[#FFF0F0] rounded-[8px]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
