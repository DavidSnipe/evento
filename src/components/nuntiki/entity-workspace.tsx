import * as React from "react";

import { cn } from "@/lib/utils";
import { entityWorkspaceVariants } from "@/lib/nuntiki/variants";

export type EntityWorkspaceProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode;
};

export function EntityWorkspace({
  header,
  className,
  children,
  ...props
}: EntityWorkspaceProps) {
  return (
    <div
      data-slot="nuntiki-entity-workspace"
      className={cn(entityWorkspaceVariants(), className)}
      {...props}
    >
      {header}
      {children}
    </div>
  );
}
