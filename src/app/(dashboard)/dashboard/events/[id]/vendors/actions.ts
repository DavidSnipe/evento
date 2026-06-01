"use server";

import { revalidatePath } from "next/cache";
import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { createClient } from "@/lib/supabase/server";

async function requireVendorEdit(eventId: string) {
  return denyUnlessEventPermission(eventId, (p) => p.canEditVendors, "canEditVendors");
}

export async function createVendor(eventId: string, formData: FormData) {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const category = formData.get("category") as string;
  const name = formData.get("name") as string;
  const contact_person = formData.get("contact_person") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const status = formData.get("status") as string;

  if (!name || !category) {
    return { error: "Numele și categoria sunt obligatorii" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("vendors").insert({
    event_id: eventId,
    category,
    name,
    contact_person,
    phone,
    email,
    status: status || 'contactat',
  });

  if (error) {
    console.error("Error creating vendor:", error);
    return { error: "A apărut o eroare la adăugarea furnizorului." };
  }

  revalidatePath(`/dashboard/events/${eventId}/vendors`);
  return { success: true };
}

export async function deleteVendor(eventId: string, vendorId: string) {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", vendorId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error deleting vendor:", error);
    return { error: "Nu am putut șterge acest furnizor." };
  }

  revalidatePath(`/dashboard/events/${eventId}/vendors`);
  return { success: true };
}
