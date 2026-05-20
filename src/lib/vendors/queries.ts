import { createClient } from "@/lib/supabase/server";
import type { Vendor } from "@/types/vendors";

export async function getVendors(eventId: string): Promise<Vendor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }

  return data;
}
