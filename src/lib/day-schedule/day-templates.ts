import type {
  DayScheduleSegment,
  DayScheduleVendorRole,
  EnabledDaySegments,
} from "@/types/day-schedule";

export type DayScheduleTemplate = {
  title: string;
  startTime: string;
  endTime: string;
  eventSegment: DayScheduleSegment;
  /** Include only when this segment is enabled on the invitation. */
  requiresEnabled?: keyof EnabledDaySegments;
  location?: string;
  responsiblePerson?: string;
  vendorRole?: DayScheduleVendorRole;
};

export const DAY_SCHEDULE_TEMPLATES: DayScheduleTemplate[] = [
  {
    title: "Machiaj mireasă",
    startTime: "09:00",
    endTime: "10:00",
    eventSegment: "party",
    responsiblePerson: "Makeup artist",
  },
  {
    title: "Sosire fotograf",
    startTime: "10:00",
    endTime: "10:30",
    eventSegment: "party",
    vendorRole: "photographer",
  },
  {
    title: "Pregătiri mire",
    startTime: "12:00",
    endTime: "13:00",
    eventSegment: "party",
  },
  {
    title: "Pregătiri mireasă",
    startTime: "13:00",
    endTime: "14:30",
    eventSegment: "party",
  },
  {
    title: "Sesiune foto",
    startTime: "14:30",
    endTime: "15:30",
    eventSegment: "party",
    vendorRole: "photographer",
  },
  {
    title: "Cununie civilă",
    startTime: "16:00",
    endTime: "17:00",
    eventSegment: "civil",
    requiresEnabled: "civil",
  },
  {
    title: "Cununie religioasă",
    startTime: "17:00",
    endTime: "18:00",
    eventSegment: "religious",
    requiresEnabled: "religious",
  },
  {
    title: "Recepție / petrecere",
    startTime: "20:00",
    endTime: "21:00",
    eventSegment: "party",
    requiresEnabled: "party",
    vendorRole: "venue",
  },
  {
    title: "Primul dans",
    startTime: "21:00",
    endTime: "21:15",
    eventSegment: "party",
    requiresEnabled: "party",
    vendorRole: "dj",
  },
  {
    title: "Tortul miresei",
    startTime: "22:00",
    endTime: "22:30",
    eventSegment: "party",
    requiresEnabled: "party",
  },
  {
    title: "Aruncarea buchetului",
    startTime: "23:00",
    endTime: "23:15",
    eventSegment: "party",
    requiresEnabled: "party",
  },
];

export function filterTemplatesForEvent(
  enabled: EnabledDaySegments
): DayScheduleTemplate[] {
  return DAY_SCHEDULE_TEMPLATES.filter((tpl) => {
    if (!tpl.requiresEnabled) return true;
    return enabled[tpl.requiresEnabled];
  });
}

export function defaultEnabledSegments(
  sections?: Partial<EnabledDaySegments> | null
): EnabledDaySegments {
  return {
    civil: sections?.civil ?? true,
    religious: sections?.religious ?? true,
    party: sections?.party ?? true,
  };
}
