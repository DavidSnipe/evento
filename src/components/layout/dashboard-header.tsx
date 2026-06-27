import type { ReactNode } from "react";

import { PageHeader } from "@/components/nuntiki/page-header";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

/** @deprecated Use PageHeader from @/components/dashboard — kept for gradual migration. */
export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return <PageHeader title={title} description={description} actions={actions} />;
}
