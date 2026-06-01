/** Day-of schedule segments (no "general" — execution focused). */
export type DayScheduleSegment = "civil" | "religious" | "party";

/** Future vendor module extension point. */
export type DayScheduleVendorRole =
  | "photographer"
  | "videographer"
  | "dj"
  | "venue";

export type DayScheduleItemRow = {
  id: string;
  event_id: string;
  schedule_date: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  responsible_person: string | null;
  event_segment: DayScheduleSegment;
  sort_order: number;
  vendor_id: string | null;
  vendor_role: DayScheduleVendorRole | null;
  created_at: string;
  updated_at: string;
};

export const DAY_SCHEDULE_SEGMENTS: DayScheduleSegment[] = [
  "civil",
  "religious",
  "party",
];

export const DAY_SCHEDULE_VENDOR_ROLES: DayScheduleVendorRole[] = [
  "photographer",
  "videographer",
  "dj",
  "venue",
];

export type DayScheduleItemInput = {
  title: string;
  scheduleDate: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  responsiblePerson?: string | null;
  eventSegment?: DayScheduleSegment;
  sortOrder?: number;
  vendorId?: string | null;
  vendorRole?: DayScheduleVendorRole | null;
};

export type EnabledDaySegments = {
  civil: boolean;
  religious: boolean;
  party: boolean;
};
