import { cn } from "@/lib/utils";

type AnimatedPageProps = {
  children: React.ReactNode;
  className?: string;
};

/** Dashboard page wrapper — no entrance animation (instant route transitions). */
export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return <div className={cn("animated-page-wrapper", className)}>{children}</div>;
}
