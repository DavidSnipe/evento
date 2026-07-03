import type { EventType } from "@/types";
import { isBaptismType, isWeddingType } from "@/types/events";

export function buildEventTitleFromForm(
  eventType: EventType,
  fields: {
    title?: string;
    groomFirstName?: string;
    brideFirstName?: string;
    parent1FirstName?: string;
    parent2FirstName?: string;
    parentLastName?: string;
    babyFirstName?: string;
  }
): string {
  if (isWeddingType(eventType)) {
    const groom = fields.groomFirstName?.trim() ?? "";
    const bride = fields.brideFirstName?.trim() ?? "";
    if (groom && bride) return `${groom} & ${bride}`;
    if (groom) return groom;
    if (bride) return bride;
    return "";
  }

  if (isBaptismType(eventType)) {
    const baby = fields.babyFirstName?.trim() ?? "";
    if (baby) return `Botezul ${baby}`;
    const mother = fields.parent1FirstName?.trim() ?? "";
    const father = fields.parent2FirstName?.trim() ?? "";
    if (mother && father) return `${mother} & ${father}`;
    const lastName = fields.parentLastName?.trim() ?? "";
    if (lastName) return `Familia ${lastName}`;
    return "";
  }

  return fields.title?.trim() ?? "";
}

export function parseNameFieldsFromFormData(formData: FormData) {
  return {
    groom_first_name: String(formData.get("groom_first_name") ?? "").trim() || null,
    groom_last_name: String(formData.get("groom_last_name") ?? "").trim() || null,
    bride_first_name: String(formData.get("bride_first_name") ?? "").trim() || null,
    bride_last_name: String(formData.get("bride_last_name") ?? "").trim() || null,
    parent1_first_name: String(formData.get("parent1_first_name") ?? "").trim() || null,
    parent1_last_name: String(formData.get("parent1_last_name") ?? "").trim() || null,
    parent2_first_name: String(formData.get("parent2_first_name") ?? "").trim() || null,
    parent2_last_name: String(formData.get("parent2_last_name") ?? "").trim() || null,
  };
}
