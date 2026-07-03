"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import type {
  TimelineCategoryRow,
  TimelineEventSegment,
  TimelineMilestoneRow,
  TimelineTaskPriority,
} from "@/types/timeline";
import { TIMELINE_EVENT_SEGMENTS } from "@/types/timeline";

const fieldClass =
  "flex h-11 min-h-11 w-full rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3 text-sm text-[var(--dash-text)]";

type TimelineCreateFormProps = {
  categories: TimelineCategoryRow[];
  milestones: TimelineMilestoneRow[];
  defaultSegment: TimelineEventSegment;
  onCreate: (input: {
    title: string;
    categoryId: string | null;
    milestoneId: string | null;
    dueDate: string | null;
    priority: TimelineTaskPriority;
    assignee: string | null;
    notes: string | null;
    eventSegment: TimelineEventSegment;
  }) => Promise<{ error?: string }>;
};

export function TimelineCreateForm({
  categories,
  milestones,
  defaultSegment,
  onCreate,
}: TimelineCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TimelineTaskPriority>("medium");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [eventSegment, setEventSegment] =
    useState<TimelineEventSegment>(defaultSegment);

  const reset = () => {
    setTitle("");
    setCategoryId("");
    setMilestoneId("");
    setDueDate("");
    setPriority("medium");
    setAssignee("");
    setNotes("");
    setEventSegment(defaultSegment);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(ro.timeline.form.titleRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onCreate({
      title: title.trim(),
      categoryId: categoryId || null,
      milestoneId: milestoneId || null,
      dueDate: dueDate || null,
      priority,
      assignee: assignee.trim() || null,
      notes: notes.trim() || null,
      eventSegment,
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
        className="min-h-11 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        {ro.timeline.actions.addTask}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="evento-card space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--dash-text)]">
          {ro.timeline.form.newTask}
        </h3>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--dash-text-muted)] transition hover:bg-[var(--dash-accent-soft)] hover:text-[var(--dash-accent-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={ro.timeline.form.titlePlaceholder}
        className="min-h-11"
        autoFocus
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={fieldClass}
        >
          <option value="">{ro.timeline.form.noCategory}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
          className={fieldClass}
        >
          <option value="">{ro.timeline.form.noMilestone}</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="min-h-11"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TimelineTaskPriority)}
          className={fieldClass}
        >
          {(["low", "medium", "high", "critical"] as const).map((p) => (
            <option key={p} value={p}>
              {ro.timeline.priority[p]}
            </option>
          ))}
        </select>
        <Input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder={ro.timeline.form.assigneePlaceholder}
          className="min-h-11"
        />
        <select
          value={eventSegment}
          onChange={(e) =>
            setEventSegment(e.target.value as TimelineEventSegment)
          }
          className={fieldClass}
        >
          {TIMELINE_EVENT_SEGMENTS.map((seg) => (
            <option key={seg} value={seg}>
              {ro.timeline.segment[seg]}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={ro.timeline.form.notesPlaceholder}
        rows={2}
        className="w-full resize-none rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3 py-2 text-sm text-[var(--dash-text)]"
      />

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting} className="min-h-11">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            ro.timeline.form.save
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          {ro.timeline.form.cancel}
        </Button>
      </div>
    </form>
  );
}
