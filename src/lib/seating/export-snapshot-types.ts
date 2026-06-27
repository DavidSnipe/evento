export const SEATING_EXPORT_UNASSIGNED_LABEL = "Nealocat";

export type SeatingExportGuestEntry = {
  id: string;
  displayName: string;
  tableName: string;
  isCoupleRow: boolean;
  guestIds: string[];
};

export type SeatingExportTableGroup = {
  id: string;
  name: string;
  sortOrder: number;
  guests: SeatingExportGuestEntry[];
};

export type SeatingExportSnapshot = {
  eventTitle: string;
  eventDate: string | null;
  tablesWithGuests: SeatingExportTableGroup[];
  unassignedGuests: SeatingExportGuestEntry[];
  totalGuests: number;
};

export type GuestListPdfSortMode = "alphabetical" | "byTable";

export type GuestListPdfOrientation = "landscape" | "portrait";
