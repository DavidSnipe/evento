"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { EventFormDialog } from "@/components/dashboard/event-form-dialog";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import type { EventRow } from "@/types/events";

type EditEventButtonProps = {
  event: EventRow;
  className?: string;
};

export function EditEventButton({ event, className }: EditEventButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        {ro.events.detail.edit}
      </Button>

      <EventFormDialog
        open={open}
        onOpenChange={setOpen}
        event={event}
        mode="edit"
      />
    </>
  );
}
