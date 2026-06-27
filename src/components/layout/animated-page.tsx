import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AnimatedPageProps = {
  children: React.ReactNode;
  className?: string;
};

/** Dashboard page wrapper — no entrance animation (instant route transitions). */
export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return <div className={cn("animated-page-wrapper", className)}>{children}</div>;
}

export type DashboardPageProps = HTMLAttributes<HTMLDivElement> & {
  header?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  animatedClassName?: string;
};

/** PageHeader, optional StatsRow, Content — matches Guests vertical rhythm. */
export function DashboardPage({
  header,
  stats,
  children,
  className,
  animatedClassName,
  ...props
}: DashboardPageProps) {
  return (
    <AnimatedPage className={cn("dashboard-page", animatedClassName)}>
      {header ? <div className="dashboard-page-header">{header}</div> : null}
      {stats ? <div className="dashboard-page-stats">{stats}</div> : null}
      <div className={cn("dashboard-page-content", className)} {...props}>
        {children}
      </div>
    </AnimatedPage>
  );
}
