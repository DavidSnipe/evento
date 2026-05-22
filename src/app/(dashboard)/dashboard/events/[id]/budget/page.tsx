import { notFound } from "next/navigation";

import { getBudgetItems } from "@/lib/budget/queries";
import { getEventById } from "@/lib/events/queries";
import { BudgetClient } from "@/components/budget/budget-client";
import { AnimatedPage } from "@/components/layout/animated-page";

export const metadata = {
  title: "Buget Eveniment | Evento",
};

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const budgetItems = await getBudgetItems(id);

  return (
    <AnimatedPage className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Buget & Cheltuieli
        </h1>
        <p className="text-muted-foreground mt-2">
          Urmărește costurile pentru {event.title}.
        </p>
      </div>

      <BudgetClient eventId={id} initialItems={budgetItems} />
    </AnimatedPage>
  );
}
