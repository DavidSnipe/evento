"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  GripVertical,
  Loader2,
  MapPin,
  MoreHorizontal,
  Music,
  Pencil,
  Trash2,
  User,
  Building2,
} from "lucide-react";

import { CalendarExportActions } from "@/components/calendar/calendar-export-actions";
import { Button } from "@/components/ui/button";
import { dayScheduleItemToCalendarEvent } from "@/lib/calendar";
import type { CalendarExportContext } from "@/lib/calendar/types";
import { Input } from "@/components/ui/input";
import { conflictsForItem } from "@/lib/day-schedule/conflicts";
import { formatTimeDisplay } from "@/lib/day-schedule/validation";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { ScheduleConflict } from "@/lib/day-schedule/conflicts";
import type {
  DayScheduleItemInput,
  DayScheduleItemRow,
  DayScheduleSegment,
  DayScheduleVendorRole,
} from "@/types/day-schedule";
import { DAY_SCHEDULE_SEGMENTS, DAY_SCHEDULE_VENDOR_ROLES } from "@/types/day-schedule";

const SEGMENT_STYLES: Record<DayScheduleSegment, string> = {
  civil: "bg-sky-50 text-sky-700 border-sky-200/60",
  religious: "bg-violet-50 text-violet-700 border-violet-200/60",
  party: "bg-[#FEF0F3] text-[#B8516B] border-[#FCEAEF]",
};

const VENDOR_ICONS: Record<DayScheduleVendorRole, typeof Camera> = {
  photographer: Camera,
  videographer: Camera,
  dj: Music,
  venue: Building2,
};

type DayScheduleItemCardProps = {
  item: DayScheduleItemRow;
  calendarContext?: CalendarExportContext;
  syncing?: boolean;
  conflicts: ScheduleConflict[];
  dragHandleProps?: {
    onPointerDown: (e: React.PointerEvent) => void;
    isDragging?: boolean;
  };
  onUpdate: (input: DayScheduleItemInput) => void;
  onDelete: () => void;
};

export function DayScheduleItemCard({
  item,
  calendarContext,
  syncing,
  conflicts,
  dragHandleProps,
  onUpdate,
  onDelete,
}: DayScheduleItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const itemConflicts = useMemo(
    () => conflictsForItem(item.id, conflicts),
    [item.id, conflicts]
  );
  const hasConflict = itemConflicts.length > 0;
  const calendarEvent = calendarContext
    ? dayScheduleItemToCalendarEvent(item, calendarContext)
    : null;

  const VendorIcon = item.vendor_role ? VENDOR_ICONS[item.vendor_role] : null;

  return (
    <article
      className={cn(
        "relative rounded-2xl border bg-white shadow-sm transition-all",
        syncing && "opacity-70",
        hasConflict
          ? "border-amber-300/80 ring-1 ring-amber-200/50"
          : "border-[rgba(210,170,185,0.2)]"
      )}
    >
      <div className="flex gap-2 p-4 sm:p-5">
        {dragHandleProps && (
          <button
            type="button"
            className={cn(
              "mt-1 shrink-0 touch-none rounded-lg p-2 text-text-subtle hover:bg-[#FEF0F3] hover:text-[#B8516B] min-h-[44px] min-w-[44px] flex items-center justify-center",
              dragHandleProps.isDragging && "cursor-grabbing bg-[#FEF0F3]"
            )}
            aria-label={ro.daySchedule.actions.reorder}
            onPointerDown={dragHandleProps.onPointerDown}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <div className="shrink-0 pt-0.5 text-left">
          <p className="font-serif text-xl font-bold text-[#1A0E14] tabular-nums leading-none">
            {formatTimeDisplay(item.start_time)}
          </p>
          {item.end_time && (
            <p className="mt-1 text-[11px] text-text-subtle tabular-nums">
              → {formatTimeDisplay(item.end_time)}
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#1A0E14] leading-snug">
                {item.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    SEGMENT_STYLES[item.event_segment]
                  )}
                >
                  {ro.daySchedule.segment[item.event_segment]}
                </span>
                {item.vendor_role && VendorIcon && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    <VendorIcon className="h-3 w-3" />
                    {ro.daySchedule.vendorRole[item.vendor_role]}
                  </span>
                )}
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-xl p-2.5 text-text-subtle hover:bg-[#FEF0F3] hover:text-[#B8516B] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={ro.daySchedule.actions.more}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-5 w-5" />
                )}
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 min-w-[140px] rounded-xl border bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-[#FEF0F3]/60 min-h-[44px]"
                      onClick={() => {
                        setExpanded(true);
                        setMenuOpen(false);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      {ro.daySchedule.actions.edit}
                    </button>
                    {calendarEvent && (
                      <div onClick={() => setMenuOpen(false)}>
                        <CalendarExportActions
                          variant="menu"
                          events={calendarEvent}
                          filename={item.title}
                          calendarName={item.title}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                      onClick={() => {
                        onDelete();
                        setMenuOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {ro.daySchedule.actions.delete}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {(item.location || item.responsible_person) && (
            <div className="space-y-1 text-sm text-text-secondary">
              {item.location && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                  {item.location}
                </p>
              )}
              {item.responsible_person && (
                <p className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                  {item.responsible_person}
                </p>
              )}
            </div>
          )}

          {hasConflict && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{itemConflicts[0]?.message}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[rgba(210,170,185,0.15)] bg-[#FEF8F9]/50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.title}
              </span>
              <Input
                defaultValue={item.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== item.title) {
                    onUpdate({
                      title: v,
                      scheduleDate: item.schedule_date,
                      startTime: item.start_time.slice(0, 5),
                      endTime: item.end_time?.slice(0, 5) ?? null,
                      location: item.location,
                      notes: item.notes,
                      responsiblePerson: item.responsible_person,
                      eventSegment: item.event_segment,
                      sortOrder: item.sort_order,
                      vendorRole: item.vendor_role,
                    });
                  }
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.segment}
              </span>
              <select
                defaultValue={item.event_segment}
                onChange={(e) =>
                  onUpdate({
                    title: item.title,
                    scheduleDate: item.schedule_date,
                    startTime: item.start_time.slice(0, 5),
                    endTime: item.end_time?.slice(0, 5) ?? null,
                    location: item.location,
                    notes: item.notes,
                    responsiblePerson: item.responsible_person,
                    eventSegment: e.target.value as DayScheduleSegment,
                    sortOrder: item.sort_order,
                    vendorRole: item.vendor_role,
                  })
                }
                className="flex h-11 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-sm"
              >
                {DAY_SCHEDULE_SEGMENTS.map((seg) => (
                  <option key={seg} value={seg}>
                    {ro.daySchedule.segment[seg]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.startTime}
              </span>
              <Input
                type="time"
                defaultValue={item.start_time.slice(0, 5)}
                className="h-11 text-base"
                onBlur={(e) => {
                  if (e.target.value && e.target.value !== item.start_time.slice(0, 5)) {
                    onUpdate({
                      title: item.title,
                      scheduleDate: item.schedule_date,
                      startTime: e.target.value,
                      endTime: item.end_time?.slice(0, 5) ?? null,
                      location: item.location,
                      notes: item.notes,
                      responsiblePerson: item.responsible_person,
                      eventSegment: item.event_segment,
                      sortOrder: item.sort_order,
                      vendorRole: item.vendor_role,
                    });
                  }
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.endTime}
              </span>
              <Input
                type="time"
                defaultValue={item.end_time?.slice(0, 5) ?? ""}
                className="h-11 text-base"
                onBlur={(e) => {
                  const v = e.target.value || null;
                  const current = item.end_time?.slice(0, 5) ?? null;
                  if (v !== current) {
                    onUpdate({
                      title: item.title,
                      scheduleDate: item.schedule_date,
                      startTime: item.start_time.slice(0, 5),
                      endTime: v,
                      location: item.location,
                      notes: item.notes,
                      responsiblePerson: item.responsible_person,
                      eventSegment: item.event_segment,
                      sortOrder: item.sort_order,
                      vendorRole: item.vendor_role,
                    });
                  }
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.location}
              </span>
              <Input
                defaultValue={item.location ?? ""}
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== item.location) {
                    onUpdate({
                      title: item.title,
                      scheduleDate: item.schedule_date,
                      startTime: item.start_time.slice(0, 5),
                      endTime: item.end_time?.slice(0, 5) ?? null,
                      location: v,
                      notes: item.notes,
                      responsiblePerson: item.responsible_person,
                      eventSegment: item.event_segment,
                      sortOrder: item.sort_order,
                      vendorRole: item.vendor_role,
                    });
                  }
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.responsible}
              </span>
              <Input
                defaultValue={item.responsible_person ?? ""}
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== item.responsible_person) {
                    onUpdate({
                      title: item.title,
                      scheduleDate: item.schedule_date,
                      startTime: item.start_time.slice(0, 5),
                      endTime: item.end_time?.slice(0, 5) ?? null,
                      location: item.location,
                      notes: item.notes,
                      responsiblePerson: v,
                      eventSegment: item.event_segment,
                      sortOrder: item.sort_order,
                      vendorRole: item.vendor_role,
                    });
                  }
                }}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.daySchedule.form.vendorRole}
              </span>
              <select
                defaultValue={item.vendor_role ?? ""}
                onChange={(e) =>
                  onUpdate({
                    title: item.title,
                    scheduleDate: item.schedule_date,
                    startTime: item.start_time.slice(0, 5),
                    endTime: item.end_time?.slice(0, 5) ?? null,
                    location: item.location,
                    notes: item.notes,
                    responsiblePerson: item.responsible_person,
                    eventSegment: item.event_segment,
                    sortOrder: item.sort_order,
                    vendorRole: (e.target.value || null) as DayScheduleVendorRole | null,
                  })
                }
                className="flex h-11 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-sm"
              >
                <option value="">{ro.daySchedule.form.noVendorRole}</option>
                {DAY_SCHEDULE_VENDOR_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ro.daySchedule.vendorRole[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase text-text-subtle">
              {ro.daySchedule.form.notes}
            </span>
            <textarea
              defaultValue={item.notes ?? ""}
              rows={2}
              className="w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 py-2 text-sm resize-none"
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== item.notes) {
                  onUpdate({
                    title: item.title,
                    scheduleDate: item.schedule_date,
                    startTime: item.start_time.slice(0, 5),
                    endTime: item.end_time?.slice(0, 5) ?? null,
                    location: item.location,
                    notes: v,
                    responsiblePerson: item.responsible_person,
                    eventSegment: item.event_segment,
                    sortOrder: item.sort_order,
                    vendorRole: item.vendor_role,
                  });
                }
              }}
            />
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
            {ro.daySchedule.actions.collapse}
          </Button>
        </div>
      )}
    </article>
  );
}
