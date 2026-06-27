"use client";

import { Progress } from "@/components/ui/progress";
import { ro } from "@/lib/i18n/ro";
import type { BudgetCategorySummary, BudgetSnapshot } from "@/types/budget";

const CHART_COLORS = ["#B8516B", "#89A293", "#E8748A", "#D97706", "#9F7AEA", "#63B3ED", "#F687B3", "#ECC94B"];

export function BudgetTargetProgress({ snapshot }: { snapshot: BudgetSnapshot }) {
  const { budgetTarget, totals } = snapshot;
  if (budgetTarget == null || budgetTarget <= 0) return null;

  const used = totals.actual;
  const percent = totals.targetUsedPercent ?? 0;

  return (
    <div className="rounded-[14px] border border-border-rose-18/30 bg-gradient-to-br from-[#FEF0F3]/40 to-white p-4 text-left">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">{ro.budgetModule.overviewHint}</p>
      <p className="mt-2 text-[15px] font-semibold text-[var(--dash-text)]">
        {ro.budgetModule.targetUsed
          .replace("{used}", used.toLocaleString("ro-RO"))
          .replace("{target}", budgetTarget.toLocaleString("ro-RO"))}
      </p>
      <p className="mt-1 text-[12px] font-medium text-[var(--dash-text-muted)]">
        {ro.budgetModule.targetConsumed.replace("{percent}", String(percent))}
      </p>
      <Progress value={percent} className="mt-3 h-2.5 bg-[var(--dash-blush)]/30" />
    </div>
  );
}

export function BudgetDistributionChart({ categories }: { categories: BudgetCategorySummary[] }) {
  const segments = categories
    .filter((c) => c.actualTotal > 0)
    .map((c, i) => ({ label: c.label, value: c.actualTotal, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-[13px] text-[var(--dash-text-muted)]">—</div>
    );
  }
  const radius = 72;
  const stroke = 28;
  const cx = 96;
  const cy = 96;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
      <svg width="192" height="192" viewBox="0 0 192 192" className="shrink-0">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--dash-warm-gray)" strokeWidth={stroke} opacity={0.35} />
        {segments.map((seg) => {
          const dash = (seg.value / total) * circumference;
          const el = (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--dash-text)" style={{ fontSize: 11 }}>
          {ro.budgetModule.total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--dash-accent-text)" style={{ fontSize: 13, fontWeight: 700 }}>
          {total.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
        </text>
      </svg>
      <ul className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="truncate text-[var(--dash-text-secondary)]">{seg.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{Math.round((seg.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
