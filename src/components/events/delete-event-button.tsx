"use client";

import { deleteEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

type DeleteEventButtonProps = {
  eventId: string;
};

export function DeleteEventButton({ eventId }: DeleteEventButtonProps) {
  return (
    <form
      action={deleteEvent.bind(null, eventId)}
      onSubmit={(e) => {
        if (!confirm(ro.events.detail.deleteConfirm)) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
        {ro.events.detail.delete}
      </Button>
    </form>
  );
}
