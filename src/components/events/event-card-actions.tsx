"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { deleteEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { ConfirmDialog } from "@/components/nuntiki/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type EventCardActionsProps = {
  eventId: string;
  className?: string;
  onEdit?: () => void;
};

export function EventCardActions({ eventId, className, onEdit }: EventCardActionsProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    setMenuOpen(false);
    router.push(`/dashboard/events/${eventId}`);
  }

  function handleEdit() {
    setMenuOpen(false);
    onEdit?.();
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      await deleteEvent(eventId);
    });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={ro.events.list.delete}
            onClick={(e) => e.preventDefault()}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dash-hairline)] bg-[var(--dash-surface)]/95 text-[var(--dash-text-secondary)] shadow-[var(--dash-shadow-sm)] backdrop-blur-sm transition-opacity hover:bg-[var(--dash-surface)] hover:text-[var(--dash-text)] max-md:opacity-100 md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100",
              className
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem onSelect={handleOpen}>{ro.events.list.open}</DropdownMenuItem>
          {onEdit ? (
            <DropdownMenuItem onSelect={handleEdit}>{ro.events.list.edit}</DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            {ro.events.list.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={ro.events.list.deleteTitle}
        description={ro.events.list.deleteBody}
        cancelLabel={ro.events.list.cancel}
        confirmLabel={ro.events.list.deleteConfirm}
        variant="destructive"
        loading={pending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
