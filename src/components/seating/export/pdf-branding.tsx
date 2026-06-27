import { Line, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

import "./pdf-fonts";
import { PDF_PLAYFAIR_FAMILY } from "./pdf-fonts";

const DUSTY_ROSE = "#dcb5be";
const SAGE = "#89a293";
const TEXT_PRIMARY = "#1c1816";
const TEXT_MUTED = "#9a9490";
const ACCENT_TEXT = "#b8516b";

const styles = StyleSheet.create({
  root: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(210, 170, 185, 0.35)",
  },
  motifRow: {
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: PDF_PLAYFAIR_FAMILY,
    fontWeight: 600,
    fontStyle: "italic",
    fontSize: 26,
    color: TEXT_PRIMARY,
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter",
    fontWeight: 300,
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 4,
  },
  date: {
    fontFamily: "Inter",
    fontSize: 10,
    color: ACCENT_TEXT,
    textAlign: "center",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  footer: {
    marginTop: 12,
    alignItems: "center",
  },
  wordmark: {
    fontFamily: PDF_PLAYFAIR_FAMILY,
    fontWeight: 700,
    fontSize: 9,
    color: DUSTY_ROSE,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});

function formatEventDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PosterMotif() {
  return (
    <Svg width={140} height={14} viewBox="0 0 140 14">
      <Line x1={0} y1={7} x2={48} y2={7} stroke={DUSTY_ROSE} strokeWidth={1} />
      <Line x1={52} y1={7} x2={88} y2={7} stroke={SAGE} strokeWidth={1.2} />
      <Line x1={92} y1={7} x2={140} y2={7} stroke={DUSTY_ROSE} strokeWidth={1} />
      <Line x1={68} y1={2} x2={72} y2={12} stroke={SAGE} strokeWidth={0.8} />
      <Line x1={72} y1={2} x2={68} y2={12} stroke={DUSTY_ROSE} strokeWidth={0.8} />
    </Svg>
  );
}

export type PdfPosterHeaderProps = {
  title: string;
  date?: string | null;
  subtitle?: string;
  compact?: boolean;
};

const compactStyles = StyleSheet.create({
  root: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(210, 170, 185, 0.35)",
  },
  motifRow: {
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontFamily: PDF_PLAYFAIR_FAMILY,
    fontWeight: 600,
    fontStyle: "italic",
    fontSize: 18,
    color: TEXT_PRIMARY,
    textAlign: "center",
    letterSpacing: 0.15,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: "Inter",
    fontWeight: 300,
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 2,
  },
  date: {
    fontFamily: "Inter",
    fontSize: 8,
    color: ACCENT_TEXT,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  footer: {
    marginTop: 5,
    alignItems: "center",
  },
  wordmark: {
    fontFamily: PDF_PLAYFAIR_FAMILY,
    fontWeight: 700,
    fontSize: 7,
    color: DUSTY_ROSE,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

export function PdfPosterHeader({ title, date, subtitle, compact = false }: PdfPosterHeaderProps) {
  const formattedDate = formatEventDate(date);
  const s = compact ? compactStyles : styles;

  return (
    <View style={s.root}>
      <View style={s.motifRow}>
        <PosterMotif />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {formattedDate ? <Text style={s.date}>{formattedDate}</Text> : null}
      <View style={s.footer}>
        <Text style={s.wordmark}>Evento</Text>
      </View>
    </View>
  );
}
