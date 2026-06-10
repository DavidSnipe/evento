import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emptyStateVariants, type EmptyStateVariants } from "@/lib/nuntiki/variants";

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> &
  EmptyStateVariants & {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
    secondaryAction?: {
      label: string;
      onClick: () => void;
    };
  };

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ size }), className)} {...props}>
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF0F3]/80 text-[#B8516B]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-text-secondary max-w-sm">{description}</p>
        ) : null}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {action ? (
            <Button type="button" size="sm" className="rounded-[10px]" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-[10px] text-[#B8516B]"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
