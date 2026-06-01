"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import type {
  DayScheduleItemInput,
  DayScheduleSegment,
  DayScheduleVendorRole,
} from "@/types/day-schedule";
import { DAY_SCHEDULE_SEGMENTS, DAY_SCHEDULE_VENDOR_ROLES } from "@/types/day-schedule";

type DayScheduleCreateFormProps = {
  scheduleDate: string;
  defaultSegment?: DayScheduleSegment;
  onCreate: (input: DayScheduleItemInput) => Promise<{ error?: string }>;
};

export function DayScheduleCreateForm({
  scheduleDate,
  defaultSegment = "party",
  onCreate,
}: DayScheduleCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");
  const [segment, setSegment] = useState<DayScheduleSegment>(defaultSegment);
  const [vendorRole, setVendorRole] = useState<DayScheduleVendorRole | "">("");

  const reset = () => {
    setTitle("");
    setStartTime("09:00");
    setEndTime("");
    setLocation("");
    setResponsible("");
    setNotes("");
    setSegment(defaultSegment);
    setVendorRole("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(ro.daySchedule.form.titleRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onCreate({
      title: title.trim(),
      scheduleDate,
      startTime,
      endTime: endTime || null,
      location: location.trim() || null,
      responsiblePerson: responsible.trim() || null,
      notes: notes.trim() || null,
      eventSegment: segment,
      vendorRole: vendorRole || null,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-[48px] text-sm"
        size="lg"
      >
        <Plus className="h-5 w-5" />
        {ro.daySchedule.actions.addItem}
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[rgba(210,170,185,0.25)] bg-white p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-[#1A0E14]">
          {ro.daySchedule.form.newItem}
        </h3>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={ro.daySchedule.form.titlePlaceholder}
        className="h-11 text-base"
        autoFocus
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="h-11 text-base"
        />
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="h-11 text-base"
          placeholder={ro.daySchedule.form.endOptional}
        />
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value as DayScheduleSegment)}
          className="flex h-11 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-sm"
        >
          {DAY_SCHEDULE_SEGMENTS.map((seg) => (
            <option key={seg} value={seg}>
              {ro.daySchedule.segment[seg]}
            </option>
          ))}
        </select>
        <select
          value={vendorRole}
          onChange={(e) =>
            setVendorRole(e.target.value as DayScheduleVendorRole | "")
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
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={ro.daySchedule.form.locationPlaceholder}
          className="h-11"
        />
        <Input
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          placeholder={ro.daySchedule.form.responsiblePlaceholder}
          className="h-11"
        />
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={ro.daySchedule.form.notesPlaceholder}
        rows={2}
        className="w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 py-2 text-sm resize-none"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" disabled={submitting} className="min-h-[48px] w-full sm:w-auto">
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          ro.daySchedule.form.save
        )}
      </Button>
    </form>
  );
}
