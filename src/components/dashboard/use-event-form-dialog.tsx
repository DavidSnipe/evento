"use client";

import { useState } from "react";

import { EventFormDialog } from "@/components/dashboard/event-form-dialog";
import type { EventRow } from "@/types/events";

export function useEventFormDialog() {
  const [open, setOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventRow | null>(null);

  function openCreateDialog() {
    setEditEvent(null);
    setOpen(true);
  }

  function openEditDialog(event: EventRow) {
    setEditEvent(event);
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditEvent(null);
    }
  }

  const dialog = (
    <EventFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      event={editEvent}
      mode={editEvent ? "edit" : "create"}
    />
  );

  return {
    open,
    editEvent,
    openCreateDialog,
    openEditDialog,
    handleOpenChange,
    dialog,
  };
}
