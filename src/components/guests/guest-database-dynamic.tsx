"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { GuestDatabaseSkeleton } from "@/components/guests/guest-database-skeleton";

const GuestDatabaseLazy = dynamic(
  () => import("@/components/guests/guest-database").then((mod) => mod.GuestDatabase),
  {
    loading: () => <GuestDatabaseSkeleton />,
    ssr: false,
  }
);

type GuestDatabaseDynamicProps = ComponentProps<typeof GuestDatabaseLazy>;

export function GuestDatabaseDynamic(props: GuestDatabaseDynamicProps) {
  return <GuestDatabaseLazy {...props} />;
}
