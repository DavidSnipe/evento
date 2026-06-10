"use client";

import * as React from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  dataTableCellVariants,
  dataTableHeadCellVariants,
  dataTableRowVariants,
  dataTableShellVariants,
  type DataTableRowVariants,
} from "@/lib/nuntiki/variants";
import { EmptyState } from "./empty-state";

export type DataTableProps = React.HTMLAttributes<HTMLDivElement>;

export function DataTable({ className, children, ...props }: DataTableProps) {
  return (
    <div
      data-slot="nuntiki-data-table"
      className={cn(dataTableShellVariants(), className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type DataTableToolbarProps = React.HTMLAttributes<HTMLDivElement>;

export function DataTableToolbar({ className, children, ...props }: DataTableToolbarProps) {
  return (
    <div
      data-slot="nuntiki-data-table-toolbar"
      className={cn("border-b border-border-rose-18/30 p-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type DataTableScrollProps = React.ComponentProps<typeof Table>;

export function DataTableScroll({ className, children, ...props }: DataTableScrollProps) {
  return (
    <div data-slot="nuntiki-data-table-scroll" className="overflow-x-auto">
      <Table className={cn("border-collapse min-w-full text-sm", className)} {...props}>
        {children}
      </Table>
    </div>
  );
}

export function DataTableHeader({
  className,
  ...props
}: React.ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader
      className={cn("[&_tr]:border-b [&_tr]:border-border-rose-18/30", className)}
      {...props}
    />
  );
}

export function DataTableBody(props: React.ComponentProps<typeof TableBody>) {
  return <TableBody className="divide-y divide-border-rose-18/20" {...props} />;
}

export function DataTableFooter(props: React.ComponentProps<typeof TableFooter>) {
  return (
    <TableFooter
      className="border-t border-border-rose-18/30 bg-[#F3F3F5]/30"
      {...props}
    />
  );
}

export type DataTableRowProps = React.ComponentProps<typeof TableRow> &
  DataTableRowVariants & {
    state?: "default" | "selected" | "muted";
  };

export function DataTableRow({
  className,
  interactive,
  state = "default",
  ...props
}: DataTableRowProps) {
  return (
    <TableRow
      data-state={state === "default" ? undefined : state}
      className={cn(dataTableRowVariants({ interactive }), className)}
      {...props}
    />
  );
}

export function DataTableHead({
  className,
  ...props
}: React.ComponentProps<typeof TableHead>) {
  return <TableHead className={cn(dataTableHeadCellVariants(), className)} {...props} />;
}

export function DataTableCell({
  className,
  ...props
}: React.ComponentProps<typeof TableCell>) {
  return <TableCell className={cn(dataTableCellVariants(), className)} {...props} />;
}

export function DataTableCaption(props: React.ComponentProps<typeof TableCaption>) {
  return (
    <TableCaption
      className="px-4 py-2 text-[10px] text-text-subtle text-center"
      {...props}
    />
  );
}

export type DataTableEmptyProps = {
  title: string;
  description?: string;
  className?: string;
};

export function DataTableEmpty({ title, description, className }: DataTableEmptyProps) {
  return (
    <EmptyState
      size="sm"
      title={title}
      description={description}
      className={cn("rounded-none border-0 bg-transparent shadow-none", className)}
    />
  );
}
