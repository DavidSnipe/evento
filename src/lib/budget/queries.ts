import { createClient } from "@/lib/supabase/server";
import type { BudgetItem } from "@/types/budget";

export async function getBudgetItems(eventId: string): Promise<BudgetItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching budget items:", error);
    return [];
  }

  return data;
}
