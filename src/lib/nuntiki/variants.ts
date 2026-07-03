import { cva, type VariantProps } from "class-variance-authority";

/** Shared panel shell — solid white cards, quiet luxury. */
export const panelShellVariants = cva(
  "rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]",
  {
    variants: {
      tone: {
        default: "",
        solid: "",
        muted: "bg-[var(--dash-ivory)] border-[var(--dash-border)]",
        highlight: "border-[var(--dash-blush)]/50 bg-[var(--dash-accent-soft)]",
        ghost: "border-dashed border-[var(--dash-border)] bg-transparent shadow-none",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
);

export const sectionCardVariants = cva("", {
  variants: {
    variant: {
      default: panelShellVariants({ tone: "solid" }),
      muted: panelShellVariants({ tone: "muted" }),
      highlight: panelShellVariants({ tone: "highlight" }),
      ghost: panelShellVariants({ tone: "ghost" }),
    },
    padding: {
      default: "",
      compact: "[&_[data-slot=card-header]]:p-4 [&_[data-slot=card-content]]:p-4 [&_[data-slot=card-content]]:pt-0",
      none: "[&_[data-slot=card-header]]:p-0 [&_[data-slot=card-content]]:p-0 [&_[data-slot=card-footer]]:p-0",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
});

export const pageHeaderVariants = cva("space-y-2", {
  variants: {
    size: {
      default: "",
      compact: "space-y-1",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

/** Apple-style display title — Geist only. */
export const pageHeaderTitleVariants = cva(
  "font-bold tracking-[-0.025em] text-[var(--dash-text)]",
  {
    variants: {
      size: {
        default: "text-[2.25rem] leading-[1.15]",
        compact: "text-2xl leading-tight",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export const pageHeaderDescriptionVariants = cva("text-[var(--dash-text-secondary)]", {
  variants: {
    size: {
      default: "mt-1.5 text-[0.8125rem] leading-relaxed",
      compact: "mt-1 text-xs",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export const statsGridVariants = cva("grid gap-3", {
  variants: {
    columns: {
      2: "grid-cols-2",
      3: "grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-2 lg:grid-cols-4",
      5: "grid-cols-2 lg:grid-cols-5",
    },
  },
  defaultVariants: {
    columns: 4,
  },
});

export const statsCardVariants = cva("evento-stat-card overflow-hidden border-0 shadow-none", {
  variants: {
    accent: {
      default: "",
      primary: "bg-[var(--dash-accent-soft)]",
      success: "bg-[rgba(137,162,147,0.08)]",
      warning: "bg-[rgba(255,159,10,0.06)]",
    },
  },
  defaultVariants: {
    accent: "default",
  },
});

export const statsLabelVariants = cva(
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--dash-text-muted)]"
);

export const statsValueVariants = cva(
  "mt-1 truncate text-[32px] font-bold leading-none tracking-tight",
  {
    variants: {
      accent: {
        default: "text-[var(--dash-text)]",
        primary: "text-[var(--dash-accent-text)]",
        success: "text-[var(--dash-sage)]",
        warning: "text-pending-orange",
        rose: "text-[var(--dash-accent-text)]",
      },
    },
    defaultVariants: {
      accent: "default",
    },
  }
);

export const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center rounded-[18px] border border-dashed border-border-rose-18/40 bg-white/40",
  {
    variants: {
      size: {
        sm: "py-8 px-4 gap-2",
        md: "py-12 px-6 gap-3",
        lg: "py-16 px-8 gap-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/** Matches guest-table-view shell exactly. */
export const dataTableShellVariants = cva(
  "overflow-hidden rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]"
);

export const dataTableHeadCellVariants = cva(
  "h-auto px-4 py-3 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-[var(--dash-text-muted)] border-r border-[var(--dash-hairline)] last:border-r-0 bg-[var(--dash-ivory)]"
);

export const dataTableCellVariants = cva(
  "px-4 py-3.5 align-middle text-sm border-r border-[var(--dash-hairline)] last:border-r-0 min-h-[56px]"
);

export const dataTableRowVariants = cva(
  "border-b border-[var(--dash-hairline)] transition-colors duration-200 hover:bg-[var(--dash-accent-soft)] data-[state=selected]:bg-[var(--dash-accent-soft)] data-[state=muted]:opacity-50",
  {
    variants: {
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      interactive: false,
    },
  }
);

export const entityLayoutVariants = cva("flex flex-col lg:flex-row gap-6 lg:gap-8");

export const entitySidebarVariants = cva("flex flex-col gap-3 lg:w-[260px] shrink-0");

export const entitySidebarNavVariants = cva(
  "flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-220px)] pb-1 lg:pb-0 lg:pr-1"
);

export const entitySidebarItemVariants = cva(
  "w-full text-left rounded-[12px] px-3 py-2.5 transition-all border cursor-pointer border-l-[2px]",
  {
    variants: {
      active: {
        true: "bg-[var(--dash-blush)]/35 border-[var(--dash-blush)]/50 shadow-[0_1px_2px_rgba(28,24,22,0.03)] border-l-[var(--dash-dusty-rose)]",
        false:
          "bg-transparent border-transparent hover:bg-[var(--dash-warm-gray)]/80 border-l-transparent",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export const entitySidebarLabelVariants = cva("text-xs font-semibold truncate", {
  variants: {
    active: {
      true: "text-[var(--dash-accent-text)]",
      false: "text-[var(--dash-text)]",
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const entitySidebarMetaVariants = cva(
  "text-[10px] font-medium text-[var(--dash-text-secondary)] mt-0.5"
);

export const entitySidebarActionVariants = cva(
  "w-full rounded-[12px] border-dashed border-[var(--dash-dusty-rose)]/35 text-xs font-semibold text-[var(--dash-accent-text)] hover:bg-[var(--dash-blush)]/25 gap-1.5 h-9"
);

export const entityWorkspaceVariants = cva("flex-1 min-w-0 space-y-5");

/** Matches import-modal / guest-detail-panel overlay. */
export const overlayVariants = cva(
  "fixed inset-0 bg-[#1A0E14]/12 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
  {
    variants: {
      layer: {
        backdrop: "z-[9998]",
        dialog: "z-50",
      },
    },
    defaultVariants: {
      layer: "dialog",
    },
  }
);

export const modalContentVariants = cva(
  "rounded-[22px] border border-border-rose-18 bg-white/95 shadow-popover backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
);

export const confirmDialogContentVariants = modalContentVariants;

export const filterToolbarVariants = cva(
  "flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border-rose-18 bg-white/70 p-3 shadow-card backdrop-blur-md"
);

export type PanelShellVariants = VariantProps<typeof panelShellVariants>;
export type SectionCardVariants = VariantProps<typeof sectionCardVariants>;
export type PageHeaderVariants = VariantProps<typeof pageHeaderVariants>;
export type StatsGridVariants = VariantProps<typeof statsGridVariants>;
export type StatsCardVariants = VariantProps<typeof statsCardVariants>;
export type StatsValueVariants = VariantProps<typeof statsValueVariants>;
export type EmptyStateVariants = VariantProps<typeof emptyStateVariants>;
export type DataTableRowVariants = VariantProps<typeof dataTableRowVariants>;
export type EntitySidebarItemVariants = VariantProps<typeof entitySidebarItemVariants>;
