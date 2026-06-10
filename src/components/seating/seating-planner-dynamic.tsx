"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { SeatingPlannerSkeleton } from "@/components/seating/seating-planner-skeleton";

const SeatingPlannerLazy = dynamic(
  () => import("@/components/seating/seating-planner").then((mod) => mod.SeatingPlanner),
  {
    loading: () => <SeatingPlannerSkeleton />,
    ssr: false,
  }
);

type SeatingPlannerDynamicProps = ComponentProps<typeof SeatingPlannerLazy>;

export function SeatingPlannerDynamic(props: SeatingPlannerDynamicProps) {
  return <SeatingPlannerLazy {...props} />;
}
