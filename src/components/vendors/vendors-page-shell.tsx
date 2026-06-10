import { cn } from "@/lib/utils";

import "./vendors-theme.css";

type VendorsPageShellProps = {
  className?: string;
  children: React.ReactNode;
};

export function VendorsPageShell({ className, children }: VendorsPageShellProps) {
  return <div className={cn("vendors-workspace min-h-0", className)}>{children}</div>;
}
