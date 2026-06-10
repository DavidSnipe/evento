import * as React from "react";

import { cn } from "@/lib/utils";
import {
  pageHeaderDescriptionVariants,
  pageHeaderTitleVariants,
  pageHeaderVariants,
  type PageHeaderVariants,
} from "@/lib/nuntiki/variants";

export type PageHeaderProps = React.HTMLAttributes<HTMLDivElement> &
  PageHeaderVariants & {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
  };

export function PageHeader({
  title,
  description,
  actions,
  meta,
  size,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn(pageHeaderVariants({ size }), className)} {...props}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          <h1 className={pageHeaderTitleVariants({ size })}>{title}</h1>
          {description ? (
            <p className={pageHeaderDescriptionVariants({ size })}>{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
