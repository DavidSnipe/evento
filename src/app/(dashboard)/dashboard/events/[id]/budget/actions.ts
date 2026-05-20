"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createBudgetItem(eventId: string, formData: FormData) {
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const estimatedCost = parseFloat(formData.get("estimated_cost") as string) || 0;
  const actualCost = parseFloat(formData.get("actual_cost") as string) || 0;
  const paidAmount = parseFloat(formData.get("paid_amount") as string) || 0;
  const dueDate = formData.get("due_date") as string;

  if (!title || !category) {
    return { error: "Titlul și categoria sunt obligatorii" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("budget_items").insert({
    event_id: eventId,
    title,
    category,
    estimated_cost: estimatedCost,
    actual_cost: actualCost,
    paid_amount: paidAmount,
    due_date: dueDate || null,
  });

  if (error) {
    console.error("Error creating budget item:", error);
    return { error: "A apărut o eroare la adăugarea costului." };
  }

  revalidatePath(`/dashboard/events/${eventId}/budget`);
  return { success: true };
}

export async function updateBudgetItem(eventId: string, itemId: string, formData: FormData) {
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const estimatedCost = parseFloat(formData.get("estimated_cost") as string) || 0;
  const actualCost = parseFloat(formData.get("actual_cost") as string) || 0;
  const paidAmount = parseFloat(formData.get("paid_amount") as string) || 0;
  const dueDate = formData.get("due_date") as string;

  const supabase = await createClient();

  const { error } = await supabase
    .from("budget_items")
    .update({
      title,
      category,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      paid_amount: paidAmount,
      due_date: dueDate || null,
    })
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error updating budget item:", error);
    return { error: "Eroare la actualizare." };
  }

  revalidatePath(`/dashboard/events/${eventId}/budget`);
  return { success: true };
}

export async function deleteBudgetItem(eventId: string, itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("budget_items")
    .delete()
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error deleting budget item:", error);
    return { error: "Nu am putut șterge acest cost." };
  }

  revalidatePath(`/dashboard/events/${eventId}/budget`);
  return { success: true };
}
