import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sectionCardVariants, type SectionCardVariants } from "@/lib/nuntiki/variants";

export type SectionCardProps = React.HTMLAttributes<HTMLDivElement> &
  SectionCardVariants & {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
  };

export function SectionCard({
  title,
  description,
  icon,
  actions,
  footer,
  variant,
  padding,
  className,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || icon || actions);

  return (
    <Card className={cn(sectionCardVariants({ variant, padding }), className)} {...props}>
      {hasHeader ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1">
            {(icon || title) && (
              <div className="flex items-center gap-2">
                {icon ? <span className="text-xl leading-none">{icon}</span> : null}
                {title ? <CardTitle>{title}</CardTitle> : null}
              </div>
            )}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      {children ? <CardContent>{children}</CardContent> : null}
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
