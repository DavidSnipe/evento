import { computeMilestoneDate } from "@/lib/timeline/milestones";
import type {
  TimelineCategoryRow,
  TimelineEventSegment,
  TimelineMilestoneRow,
  TimelineTaskPriority,
} from "@/types/timeline";

export type WeddingChecklistTemplate = {
  title: string;
  categorySlug: string;
  monthsBefore?: number;
  weeksBefore?: number;
  daysBefore?: number;
  priority: TimelineTaskPriority;
  eventSegment: TimelineEventSegment;
};

export const WEDDING_CHECKLIST_TEMPLATES: WeddingChecklistTemplate[] = [
  {
    title: "Rezervă locația",
    categorySlug: "venue",
    monthsBefore: 12,
    priority: "critical",
    eventSegment: "general",
  },
  {
    title: "Pregătește actele pentru cununia civilă",
    categorySlug: "legal",
    monthsBefore: 12,
    priority: "high",
    eventSegment: "civil",
  },
  {
    title: "Rezervă fotograful",
    categorySlug: "photography",
    monthsBefore: 9,
    priority: "high",
    eventSegment: "general",
  },
  {
    title: "Rezervă videograful",
    categorySlug: "video",
    monthsBefore: 9,
    priority: "medium",
    eventSegment: "general",
  },
  {
    title: "Probează rochia de mireasă",
    categorySlug: "attire",
    monthsBefore: 6,
    priority: "high",
    eventSegment: "general",
  },
  {
    title: "Rezervă DJ / formația",
    categorySlug: "music",
    monthsBefore: 6,
    priority: "medium",
    eventSegment: "party",
  },
  {
    title: "Confirmă meniul cu cateringul",
    categorySlug: "catering",
    monthsBefore: 3,
    priority: "high",
    eventSegment: "party",
  },
  {
    title: "Trimite invitațiile",
    categorySlug: "invitations",
    monthsBefore: 3,
    priority: "critical",
    eventSegment: "general",
  },
  {
    title: "Finalizează aranjarea meselor",
    categorySlug: "other",
    monthsBefore: 1,
    priority: "high",
    eventSegment: "party",
  },
  {
    title: "Confirmă detaliile cu preotul",
    categorySlug: "religious",
    monthsBefore: 1,
    priority: "high",
    eventSegment: "religious",
  },
  {
    title: "Verifică decorațiunile",
    categorySlug: "decorations",
    weeksBefore: 1,
    priority: "medium",
    eventSegment: "party",
  },
  {
    title: "Pregătește pachetele pentru invitați",
    categorySlug: "other",
    daysBefore: 1,
    priority: "medium",
    eventSegment: "party",
  },
];

export function resolveTemplateMilestoneId(
  template: WeddingChecklistTemplate,
  milestones: TimelineMilestoneRow[]
): string | null {
  const match = milestones.find((m) => {
    if (template.monthsBefore != null) return m.months_before === template.monthsBefore;
    if (template.weeksBefore != null) return m.weeks_before === template.weeksBefore;
    if (template.daysBefore != null) return m.days_before === template.daysBefore;
    return false;
  });
  return match?.id ?? null;
}

export function resolveTemplateCategoryId(
  template: WeddingChecklistTemplate,
  categories: TimelineCategoryRow[]
): string | null {
  return categories.find((c) => c.slug === template.categorySlug)?.id ?? null;
}

export function resolveTemplateDueDate(
  template: WeddingChecklistTemplate,
  eventDate: string,
  milestones: TimelineMilestoneRow[]
): string | null {
  const milestoneId = resolveTemplateMilestoneId(template, milestones);
  const milestone = milestones.find((m) => m.id === milestoneId);
  if (milestone) return computeMilestoneDate(eventDate, milestone);
  return null;
}
