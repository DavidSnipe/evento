import { cva, type VariantProps } from "class-variance-authority";

/** Shared panel shell — cards, tables, toolbars. */
export const panelShellVariants = cva(
  "rounded-[18px] border border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md",
  {
    variants: {
      tone: {
        default: "",
        solid: "bg-white/95",
        muted: "bg-[#F3F3F5]/40 border-border-rose-18/30",
        highlight:
          "border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-[#FEF0F3]/30",
        ghost: "border-dashed border-border-rose-18/40 bg-white/40 shadow-none",
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

export const pageHeaderTitleVariants = cva(
  "font-serif font-bold tracking-tight text-foreground",
  {
    variants: {
      size: {
        default: "text-3xl",
        compact: "text-2xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export const pageHeaderDescriptionVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      default: "mt-2 text-sm",
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
      3: "grid-cols-1 sm:grid-cols-3",
      4: "grid-cols-2 sm:grid-cols-4",
    },
  },
  defaultVariants: {
    columns: 4,
  },
});

export const statsCardVariants = cva(
  "glass-panel border bg-white p-4 shadow-card rounded-[18px]",
  {
    variants: {
      accent: {
        default: "",
        primary: "bg-primary/5 border-primary/10",
        success: "border-emerald-200/60 bg-emerald-50/40",
        warning: "border-[#FF9F0A]/20 bg-[#FF9F0A]/5",
      },
    },
    defaultVariants: {
      accent: "default",
    },
  }
);

export const statsLabelVariants = cva(
  "text-[9.5px] font-bold uppercase tracking-wider text-text-subtle"
);

export const statsValueVariants = cva("mt-1.5 font-sans text-2xl font-bold", {
  variants: {
    accent: {
      default: "text-[#1A0E14]",
      primary: "text-primary",
      success: "text-confirmed-green",
      warning: "text-pending-orange",
      rose: "text-[#B8516B]",
    },
  },
  defaultVariants: {
    accent: "default",
  },
});

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

export const dataTableShellVariants = cva(
  "overflow-hidden rounded-[18px] border border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md"
);

export const dataTableHeadCellVariants = cva(
  "h-auto px-3 py-2.5 text-left align-middle text-[9.5px] font-bold uppercase tracking-wider text-text-subtle border-r border-border-rose-18/20 last:border-r-0 bg-[#F3F3F5]/40"
);

export const dataTableCellVariants = cva(
  "px-3 py-2 align-middle text-xs border-r border-border-rose-18/20 last:border-r-0"
);

export const dataTableRowVariants = cva(
  "border-b border-border-rose-18/20 transition-all duration-200 hover:bg-[#FEF0F3]/12 data-[state=selected]:bg-[#FEF0F3]/60 data-[state=muted]:opacity-50",
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
  "w-full text-left rounded-[12px] px-3 py-2.5 transition-all border cursor-pointer border-l-[3px]",
  {
    variants: {
      active: {
        true: "bg-[#FEF0F3] border-[#FCEAEF] shadow-[0_2px_8px_rgba(184,81,107,0.06)] border-l-[#B8516B]",
        false:
          "bg-white/60 border-transparent hover:bg-[#F3F3F5]/80 border-l-transparent",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export const entitySidebarLabelVariants = cva("text-xs font-bold truncate", {
  variants: {
    active: {
      true: "text-[#B8516B]",
      false: "text-foreground",
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const entitySidebarMetaVariants = cva(
  "text-[10px] font-medium text-text-secondary mt-0.5"
);

export const entitySidebarActionVariants = cva(
  "w-full rounded-[12px] border-dashed border-[#d2aaa9]/40 text-xs font-semibold text-[#B8516B] hover:bg-[#FEF0F3]/40 gap-1.5 h-9"
);

export const entityWorkspaceVariants = cva("flex-1 min-w-0 space-y-5");

/** Nuntiki modal overlay — matches import-modal / guest-detail-panel. */
export const overlayVariants = cva(
  "fixed inset-0 bg-[#1A0E14]/15 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
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

export type PanelShellVariants = VariantProps<typeof panelShellVariants>;
export type SectionCardVariants = VariantProps<typeof sectionCardVariants>;
export type PageHeaderVariants = VariantProps<typeof pageHeaderVariants>;
export type StatsGridVariants = VariantProps<typeof statsGridVariants>;
export type StatsCardVariants = VariantProps<typeof statsCardVariants>;
export type StatsValueVariants = VariantProps<typeof statsValueVariants>;
export type EmptyStateVariants = VariantProps<typeof emptyStateVariants>;
export type DataTableRowVariants = VariantProps<typeof dataTableRowVariants>;
export type EntitySidebarItemVariants = VariantProps<typeof entitySidebarItemVariants>;
