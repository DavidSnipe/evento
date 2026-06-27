import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import "./pdf-fonts";

import {
  type GuestListPdfOrientation,
  type GuestListPdfSortMode,
  type SeatingExportGuestEntry,
  type SeatingExportSnapshot,
  type SeatingExportTableGroup,
} from "@/lib/seating/export-snapshot-types";

import { PdfPosterHeader } from "./pdf-branding";
import { PDF_PLAYFAIR_FAMILY } from "./pdf-fonts";

const TEXT_PRIMARY = "#1c1816";
const TEXT_GUEST = "#3a3532";
const TEXT_SECTION_HEADING = "#4a4038";

const A3_LANDSCAPE_WIDTH_PT = 1190.55;
const A3_LANDSCAPE_HEIGHT_PT = 841.89;
const A3_PORTRAIT_WIDTH_PT = 841.89;
const A3_PORTRAIT_HEIGHT_PT = 1190.55;

const SIDE_MARGIN_PT = 50;
const VERTICAL_MARGIN_PT = 40;
const COLUMN_GAP_PT = 20;
const LANDSCAPE_COLUMN_COUNT = 5;
const PORTRAIT_COLUMN_COUNT = 4;
const HEADER_HEIGHT_PT = 110;
const SEPARATOR_SPACING_PT = 24;

const LANDSCAPE_COLUMN_WIDTH_PT = (A3_LANDSCAPE_WIDTH_PT - 100 - 4 * COLUMN_GAP_PT) / 5;
const PORTRAIT_COLUMN_WIDTH_PT = (A3_PORTRAIT_WIDTH_PT - 100 - 3 * COLUMN_GAP_PT) / 4;

const LANDSCAPE_CONTENT_HEIGHT_PT =
  A3_LANDSCAPE_HEIGHT_PT - 80 - HEADER_HEIGHT_PT - SEPARATOR_SPACING_PT;
const PORTRAIT_CONTENT_HEIGHT_PT =
  A3_PORTRAIT_HEIGHT_PT - 80 - HEADER_HEIGHT_PT - SEPARATOR_SPACING_PT;

const BASE_REFERENCE_FONT_PT = 8;
const BASE_SECTION_GAP_PT = 16;
const LINE_HEIGHT = 1.6;
const MIN_FONT_PT = 7;
const MAX_FONT_PT = 11;
const TARGET_FILL_RATIO = 0.9;
const FONT_SIZE_REFINEMENT_ITERATIONS = 4;

export type GuestListTypography = {
  fontSize: number;
  headingSize: number;
  sectionGap: number;
};

type LetterSection = {
  letter: string;
  entries: SeatingExportGuestEntry[];
};

type ListStyles = ReturnType<typeof createListStyles>;

function getColumnCount(orientation: GuestListPdfOrientation): number {
  return orientation === "landscape" ? LANDSCAPE_COLUMN_COUNT : PORTRAIT_COLUMN_COUNT;
}

function getColumnWidth(orientation: GuestListPdfOrientation): number {
  return orientation === "landscape" ? LANDSCAPE_COLUMN_WIDTH_PT : PORTRAIT_COLUMN_WIDTH_PT;
}

function getAvailableContentHeight(orientation: GuestListPdfOrientation): number {
  return orientation === "landscape"
    ? LANDSCAPE_CONTENT_HEIGHT_PT
    : PORTRAIT_CONTENT_HEIGHT_PT;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDisplayName(entry: SeatingExportGuestEntry): string {
  if (entry.isCoupleRow) {
    return entry.displayName.replace(" & ", " și ");
  }
  return entry.displayName;
}

function formatMasaLabel(tableName: string): string {
  const match = tableName.match(/^Masa\s+(\d+)$/i);
  if (match) return `Masa ${match[1]}`;
  return tableName;
}

function formatGuestLine(entry: SeatingExportGuestEntry): string {
  return `${formatDisplayName(entry)} - ${formatMasaLabel(entry.tableName)}`;
}

function getFirstLetter(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "#";
  const letter = trimmed[0].toLocaleUpperCase("ro");
  return /[A-ZĂÂÎȘȚ]/i.test(letter) ? letter : "#";
}

function getSurnameFromDisplayName(displayName: string): string {
  const primaryName = displayName.split(" & ")[0]?.trim() ?? displayName.trim();
  return primaryName.split(/\s+/)[0] ?? primaryName;
}

function getSurnameLetter(entry: SeatingExportGuestEntry): string {
  return getFirstLetter(getSurnameFromDisplayName(entry.displayName));
}

function extractTableNumber(tableName: string): number | null {
  const match = tableName.match(/^Masa\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function compareTables(a: SeatingExportTableGroup, b: SeatingExportTableGroup): number {
  const numA = extractTableNumber(a.name);
  const numB = extractTableNumber(b.name);

  if (numA !== null && numB !== null) return numA - numB;
  if (numA !== null) return -1;
  if (numB !== null) return 1;

  return a.name.localeCompare(b.name, "ro");
}

function compareLetterKeys(a: string, b: string): number {
  if (a === "#" && b !== "#") return 1;
  if (b === "#" && a !== "#") return -1;
  return a.localeCompare(b, "ro", { sensitivity: "base" });
}

function estimateLetterSectionWeight(section: LetterSection): number {
  if (section.entries.length === 0) return 0;
  return 1 + section.entries.length + 1;
}

function estimateTableSectionWeight(table: SeatingExportTableGroup): number {
  if (table.guests.length === 0) return 0;
  return 1 + table.guests.length + 1;
}

function distributeIntoColumnsInOrder<T>(
  items: T[],
  columnCount: number,
  weightOf: (item: T) => number
): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  const weightedItems = items.filter((item) => weightOf(item) > 0);
  if (weightedItems.length === 0) return columns;

  const totalWeight = weightedItems.reduce((sum, item) => sum + weightOf(item), 0);
  const targetPerColumn = totalWeight / columnCount;

  let columnIndex = 0;
  let columnWeight = 0;

  for (const item of weightedItems) {
    const weight = weightOf(item);
    if (
      columnIndex < columnCount - 1 &&
      columnWeight > 0 &&
      columnWeight + weight / 2 > targetPerColumn
    ) {
      columnIndex += 1;
      columnWeight = 0;
    }
    columns[columnIndex].push(item);
    columnWeight += weight;
  }

  return columns;
}

function buildLetterSections(snapshot: SeatingExportSnapshot): LetterSection[] {
  const assigned = snapshot.tablesWithGuests.flatMap((table) => table.guests);
  const letterGroups = new Map<string, SeatingExportGuestEntry[]>();

  for (const entry of assigned) {
    const letter = getSurnameLetter(entry);
    const group = letterGroups.get(letter) ?? [];
    group.push(entry);
    letterGroups.set(letter, group);
  }

  return [...letterGroups.keys()]
    .sort(compareLetterKeys)
    .map((letter) => ({
      letter,
      entries: (letterGroups.get(letter) ?? []).sort((a, b) =>
        formatDisplayName(a).localeCompare(formatDisplayName(b), "ro")
      ),
    }));
}

function buildTableSections(snapshot: SeatingExportSnapshot): SeatingExportTableGroup[] {
  return [...snapshot.tablesWithGuests].sort(compareTables);
}

function sectionGapForFontSize(fontSize: number): number {
  return BASE_SECTION_GAP_PT * (fontSize / BASE_REFERENCE_FONT_PT);
}

function charsPerLineForColumn(
  fontSize: number,
  orientation: GuestListPdfOrientation
): number {
  const columnWidth = getColumnWidth(orientation);
  return Math.max(16, Math.floor(columnWidth / (fontSize * 0.48)));
}

function estimateGuestLineCount(
  text: string,
  fontSize: number,
  orientation: GuestListPdfOrientation
): number {
  const charsPerLine = charsPerLineForColumn(fontSize, orientation);
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function estimateSectionHeightPt(
  guestLineTexts: string[],
  fontSize: number,
  orientation: GuestListPdfOrientation
): number {
  const headingSize = fontSize + 3;
  const headingHeight = headingSize * LINE_HEIGHT + fontSize * 0.25;
  const guestHeight = guestLineTexts.reduce(
    (sum, text) =>
      sum + estimateGuestLineCount(text, fontSize, orientation) * fontSize * LINE_HEIGHT,
    0
  );

  return headingHeight + guestHeight + sectionGapForFontSize(fontSize);
}

function estimateColumnHeightPt<T>(
  sections: T[],
  guestLinesForSection: (section: T) => string[],
  fontSize: number,
  orientation: GuestListPdfOrientation
): number {
  return sections.reduce(
    (sum, section) =>
      sum + estimateSectionHeightPt(guestLinesForSection(section), fontSize, orientation),
    0
  );
}

function getMaxColumnHeightPt(
  snapshot: SeatingExportSnapshot,
  sortMode: GuestListPdfSortMode,
  orientation: GuestListPdfOrientation,
  fontSize: number
): number {
  const columnCount = getColumnCount(orientation);

  if (sortMode === "byTable") {
    const tables = buildTableSections(snapshot).filter((table) => table.guests.length > 0);
    const columns = distributeIntoColumnsInOrder(
      tables,
      columnCount,
      estimateTableSectionWeight
    );
    return Math.max(
      0,
      ...columns.map((column) =>
        estimateColumnHeightPt(
          column,
          (table) => table.guests.map((guest) => formatDisplayName(guest)),
          fontSize,
          orientation
        )
      )
    );
  }

  const sections = buildLetterSections(snapshot).filter(
    (section) => section.entries.length > 0
  );
  const columns = distributeIntoColumnsInOrder(
    sections,
    columnCount,
    estimateLetterSectionWeight
  );
  return Math.max(
    0,
    ...columns.map((column) =>
      estimateColumnHeightPt(
        column,
        (section) => section.entries.map((entry) => formatGuestLine(entry)),
        fontSize,
        orientation
      )
    )
  );
}

function countTotalRows(
  snapshot: SeatingExportSnapshot,
  sortMode: GuestListPdfSortMode
): number {
  if (sortMode === "byTable") {
    return buildTableSections(snapshot)
      .filter((table) => table.guests.length > 0)
      .reduce((sum, table) => sum + 1 + table.guests.length + 1, 0);
  }

  return buildLetterSections(snapshot)
    .filter((section) => section.entries.length > 0)
    .reduce((sum, section) => sum + 1 + section.entries.length + 1, 0);
}

export function computeFontSize(
  snapshot: SeatingExportSnapshot,
  sortMode: GuestListPdfSortMode,
  orientation: GuestListPdfOrientation
): GuestListTypography {
  const columnCount = getColumnCount(orientation);
  const availableHeight = getAvailableContentHeight(orientation);
  const totalRows = countTotalRows(snapshot, sortMode);
  const availableRowSlots =
    Math.floor(availableHeight / (BASE_REFERENCE_FONT_PT * LINE_HEIGHT)) * columnCount;
  const legacyDensity = availableRowSlots > 0 ? totalRows / availableRowSlots : 1;

  const maxColumnHeightAtBase = getMaxColumnHeightPt(
    snapshot,
    sortMode,
    orientation,
    BASE_REFERENCE_FONT_PT
  );

  let fontSize = BASE_REFERENCE_FONT_PT;
  if (maxColumnHeightAtBase > 0) {
    const targetHeight = availableHeight * TARGET_FILL_RATIO;
    fontSize = clamp(
      BASE_REFERENCE_FONT_PT * (targetHeight / maxColumnHeightAtBase),
      MIN_FONT_PT,
      MAX_FONT_PT
    );

    for (let iteration = 0; iteration < FONT_SIZE_REFINEMENT_ITERATIONS; iteration += 1) {
      const columnHeight = getMaxColumnHeightPt(
        snapshot,
        sortMode,
        orientation,
        fontSize
      );
      if (columnHeight <= 0) break;

      const refined = fontSize * (targetHeight / columnHeight);
      if (Math.abs(refined - fontSize) < 0.05) break;
      fontSize = clamp(refined, MIN_FONT_PT, MAX_FONT_PT);
    }
  }

  const headingSize = fontSize + 3;
  const sectionGap = sectionGapForFontSize(fontSize);
  const maxColumnHeightAtResult = getMaxColumnHeightPt(
    snapshot,
    sortMode,
    orientation,
    fontSize
  );
  const fillRatio =
    availableHeight > 0 ? maxColumnHeightAtResult / availableHeight : 0;

  if (process.env.NODE_ENV === "development") {
    console.log("[guest-list-pdf] computeFontSize", {
      sortMode,
      orientation,
      tableCount: snapshot.tablesWithGuests.filter((t) => t.guests.length > 0).length,
      totalGuests: snapshot.totalGuests,
      totalRows,
      availableRowSlots,
      legacyDensity: Number(legacyDensity.toFixed(3)),
      availableHeightPt: Number(availableHeight.toFixed(1)),
      maxColumnHeightAtBasePt: Number(maxColumnHeightAtBase.toFixed(1)),
      maxColumnHeightAtResultPt: Number(maxColumnHeightAtResult.toFixed(1)),
      fillRatio: Number(fillRatio.toFixed(3)),
      fontSize: Number(fontSize.toFixed(2)),
      headingSize: Number(headingSize.toFixed(2)),
      sectionGap: Number(sectionGap.toFixed(2)),
    });
  }

  return { fontSize, headingSize, sectionGap };
}

function createListStyles(
  typography: GuestListTypography,
  columnWidth: number
) {
  return StyleSheet.create({
    columnsRow: {
      flexDirection: "row",
      gap: COLUMN_GAP_PT,
      alignItems: "flex-start",
    },
    column: {
      width: columnWidth,
    },
    section: {
      marginBottom: typography.sectionGap,
    },
    sectionHeading: {
      fontFamily: PDF_PLAYFAIR_FAMILY,
      fontWeight: 600,
      fontStyle: "italic",
      fontSize: typography.headingSize,
      lineHeight: LINE_HEIGHT,
      color: TEXT_SECTION_HEADING,
      letterSpacing: 0.35,
      marginBottom: typography.fontSize * 0.25,
    },
    guestLine: {
      fontFamily: "Inter",
      fontWeight: 300,
      fontSize: typography.fontSize,
      lineHeight: LINE_HEIGHT,
      color: TEXT_GUEST,
      letterSpacing: 0.02,
    },
  });
}

function createPageStyles(typography: GuestListTypography) {
  return StyleSheet.create({
    page: {
      paddingTop: VERTICAL_MARGIN_PT,
      paddingBottom: VERTICAL_MARGIN_PT,
      paddingHorizontal: SIDE_MARGIN_PT,
      backgroundColor: "#f5f4f3",
      fontFamily: "Inter",
      fontWeight: 300,
      fontSize: typography.fontSize,
      color: TEXT_GUEST,
    },
    headerBlock: {
      marginBottom: SEPARATOR_SPACING_PT,
      minHeight: HEADER_HEIGHT_PT,
    },
  });
}

function AlphabeticalGuestList({
  snapshot,
  listStyles,
  columnCount,
}: {
  snapshot: SeatingExportSnapshot;
  listStyles: ListStyles;
  columnCount: number;
}) {
  const sections = buildLetterSections(snapshot).filter(
    (section) => section.entries.length > 0
  );
  const columns = distributeIntoColumnsInOrder(
    sections,
    columnCount,
    estimateLetterSectionWeight
  );

  return (
    <View style={listStyles.columnsRow}>
      {columns.map((columnSections, columnIndex) => (
        <View key={`col-${columnIndex}`} style={listStyles.column}>
          {columnSections.map((section) => (
            <View key={section.letter} style={listStyles.section} wrap={false}>
              <Text style={listStyles.sectionHeading}>{section.letter}</Text>
              {section.entries.map((entry) => (
                <Text key={entry.id} style={listStyles.guestLine}>
                  {formatGuestLine(entry)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ByTableGuestList({
  snapshot,
  listStyles,
  columnCount,
}: {
  snapshot: SeatingExportSnapshot;
  listStyles: ListStyles;
  columnCount: number;
}) {
  const tables = buildTableSections(snapshot).filter((table) => table.guests.length > 0);
  const columns = distributeIntoColumnsInOrder(
    tables,
    columnCount,
    estimateTableSectionWeight
  );

  return (
    <View style={listStyles.columnsRow}>
      {columns.map((columnTables, columnIndex) => (
        <View key={`col-${columnIndex}`} style={listStyles.column}>
          {columnTables.map((table) => (
            <View key={table.id} style={listStyles.section} wrap={false}>
              <Text style={listStyles.sectionHeading}>{table.name}</Text>
              {table.guests.map((guest) => (
                <Text key={guest.id} style={listStyles.guestLine}>
                  {formatDisplayName(guest)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export type GuestListPdfDocumentProps = {
  snapshot: SeatingExportSnapshot;
  sortMode: GuestListPdfSortMode;
  orientation?: GuestListPdfOrientation;
};

export function GuestListPdfDocument({
  snapshot,
  sortMode,
  orientation = "landscape",
}: GuestListPdfDocumentProps) {
  const typography = computeFontSize(snapshot, sortMode, orientation);
  const columnCount = getColumnCount(orientation);
  const columnWidth = getColumnWidth(orientation);
  const pageStyles = createPageStyles(typography);
  const listStyles = createListStyles(typography, columnWidth);

  return (
    <Document title={`Lista invitați — ${snapshot.eventTitle}`}>
      <Page size="A3" orientation={orientation} style={pageStyles.page} wrap>
        <View style={pageStyles.headerBlock}>
          <PdfPosterHeader
            title={snapshot.eventTitle}
            subtitle="Bine ați venit!"
            date={snapshot.eventDate}
            compact
          />
        </View>
        {sortMode === "alphabetical" ? (
          <AlphabeticalGuestList
            snapshot={snapshot}
            listStyles={listStyles}
            columnCount={columnCount}
          />
        ) : (
          <ByTableGuestList
            snapshot={snapshot}
            listStyles={listStyles}
            columnCount={columnCount}
          />
        )}
      </Page>
    </Document>
  );
}
