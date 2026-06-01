import { AnimatedPage } from "@/components/layout/animated-page";

export default function DayScheduleLoading() {
  return (
    <AnimatedPage className="space-y-6">
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-[#FCEAEF]/60" />
        <div className="h-4 w-72 rounded-lg bg-[#FCEAEF]/40" />
      </div>
      <div className="h-12 w-64 rounded-xl bg-[#FCEAEF]/30 animate-pulse" />
      <div className="h-96 rounded-2xl bg-[#FCEAEF]/30 animate-pulse" />
    </AnimatedPage>
  );
}
