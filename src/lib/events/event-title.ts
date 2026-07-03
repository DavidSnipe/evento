import type { EventType } from "@/types";
import {
  isBaptismType,
  isMajoratType,
  isWeddingType,
  usesManualTitle,
} from "@/lib/events/event-types";

export function buildEventTitleFromForm(
  eventType: EventType,
  fields: {
    title?: string;
    groomFirstName?: string;
    brideFirstName?: string;
    parent1FirstName?: string;
    parent2FirstName?: string;
    parentLastName?: string;
    childFirstName?: string;
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
    const child =
      fields.childFirstName?.trim() || fields.babyFirstName?.trim() || "";
    if (child) return `Botezul lui ${child}`;
    const lastName = fields.parentLastName?.trim() ?? "";
    if (lastName) return `Botez ${lastName}`;
    return "";
  }

  if (isMajoratType(eventType)) {
    const name = fields.groomFirstName?.trim() ?? "";
    if (name) return `Majorat ${name}`;
    return "";
  }

  if (usesManualTitle(eventType)) {
    return fields.title?.trim() ?? "";
  }

  return fields.title?.trim() ?? "";
}

export function parseNameFieldsFromFormData(formData: FormData) {
  const childFirst =
    String(formData.get("child_first_name") ?? "").trim() ||
    String(formData.get("baby_first_name") ?? "").trim() ||
    null;

  return {
    groom_first_name: String(formData.get("groom_first_name") ?? "").trim() || null,
    groom_last_name: String(formData.get("groom_last_name") ?? "").trim() || null,
    bride_first_name: String(formData.get("bride_first_name") ?? "").trim() || null,
    bride_last_name: String(formData.get("bride_last_name") ?? "").trim() || null,
    parent1_first_name: String(formData.get("parent1_first_name") ?? "").trim() || null,
    parent1_last_name: String(formData.get("parent1_last_name") ?? "").trim() || null,
    parent2_first_name: String(formData.get("parent2_first_name") ?? "").trim() || null,
    parent2_last_name: String(formData.get("parent2_last_name") ?? "").trim() || null,
    child_first_name: childFirst,
    godparent1_name:
      String(formData.get("godfather_name") ?? formData.get("godparent1_name") ?? "").trim() ||
      null,
    godparent2_name:
      String(formData.get("godmother_name") ?? formData.get("godparent2_name") ?? "").trim() ||
      null,
  };
}
