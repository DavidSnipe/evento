"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  entityLayoutVariants,
  entitySidebarActionVariants,
  entitySidebarItemVariants,
  entitySidebarLabelVariants,
  entitySidebarMetaVariants,
  entitySidebarNavVariants,
  entitySidebarVariants,
} from "@/lib/nuntiki/variants";

export type EntitySidebarProps = React.HTMLAttributes<HTMLElement> & {
  title?: string;
  topAction?: React.ReactNode;
  bottomAction?: React.ReactNode;
  navLabel?: string;
};

export function EntitySidebar({
  title,
  topAction,
  bottomAction,
  navLabel,
  className,
  children,
  ...props
}: EntitySidebarProps) {
  return (
    <aside
      data-slot="nuntiki-entity-sidebar"
      className={cn(entitySidebarVariants(), className)}
      {...props}
    >
      {title ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle px-1">
          {title}
        </p>
      ) : null}
      {topAction}
      <nav className={entitySidebarNavVariants()} aria-label={navLabel}>
        <ScrollArea className="lg:max-h-[calc(100vh-220px)]">
          <div className="flex lg:flex-col gap-2 pr-1">{children}</div>
        </ScrollArea>
      </nav>
      {bottomAction ? (
        <div className="hidden lg:block pt-1">
          <Separator className="mb-3 bg-border-rose-18/30" />
          {bottomAction}
        </div>
      ) : null}
    </aside>
  );
}

export type EntitySidebarItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
  meta?: string;
};

export function EntitySidebarItem({
  active = false,
  icon,
  label,
  meta,
  className,
  ...props
}: EntitySidebarItemProps) {
  return (
    <div className="min-w-[200px] lg:min-w-0 shrink-0 lg:shrink">
      <button
        type="button"
        className={cn(entitySidebarItemVariants({ active }), className)}
        {...props}
      >
        <div className="flex items-start gap-2">
          {icon ? (
            <span className="text-base leading-none mt-0.5" aria-hidden>
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className={entitySidebarLabelVariants({ active })}>{label}</p>
            {meta ? <p className={entitySidebarMetaVariants()}>{meta}</p> : null}
          </div>
        </div>
      </button>
    </div>
  );
}

export type EntitySidebarActionProps = React.ComponentProps<typeof Button>;

export function EntitySidebarAction({ className, ...props }: EntitySidebarActionProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(entitySidebarActionVariants(), className)}
      {...props}
    />
  );
}

export type EntityLayoutProps = React.HTMLAttributes<HTMLDivElement>;

export function EntityLayout({ className, children, ...props }: EntityLayoutProps) {
  return (
    <div className={cn(entityLayoutVariants(), className)} {...props}>
      {children}
    </div>
  );
}
