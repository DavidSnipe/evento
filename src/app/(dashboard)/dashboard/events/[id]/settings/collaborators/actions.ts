"use server";

import { revalidatePath } from "next/cache";

import { logEventActivity } from "@/lib/collaboration/activity";
import {
  checkCollaborationReady,
  isCollaborationTableMissing,
} from "@/lib/collaboration/queries";
import { logAccessDecision } from "@/lib/collaboration/access-debug";
import {
  normalizeCollaboratorEmail,
  parseCollaboratorRole,
  validateCollaboratorInviteInput,
  type CollaborationActionResult,
} from "@/lib/collaboration/validation";
import { assertManageCollaborators } from "@/lib/events/assert-event-access";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/site-url";
import type { CollaboratorRole } from "@/types/collaboration";

const MIGRATION_HINT =
  "Rulează migrarea 015_event_collaboration.sql în Supabase (SQL Editor).";

function migrationError(): CollaborationActionResult {
  return { error: MIGRATION_HINT };
}

function revalidateCollaborationViews(eventId: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function inviteCollaborator(
  eventId: string,
  email: string,
  role: CollaboratorRole
): Promise<CollaborationActionResult> {
  const auth = await assertManageCollaborators(eventId);
  if (!auth.ok) return { error: auth.error };

  const validation = validateCollaboratorInviteInput({ email, role });
  if (validation) return { error: validation };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedEmail = normalizeCollaboratorEmail(email);

  if (user?.email && normalizeCollaboratorEmail(user.email) === normalizedEmail) {
    return { error: "Nu te poți invita pe tine însuți." };
  }

  const { data, error } = await supabase
    .from("event_collaborators")
    .insert({
      event_id: eventId,
      email: normalizedEmail,
      role,
      status: "pending",
      invited_by: user?.id ?? null,
    })
    .select("id, invite_token")
    .single();

  if (error) {
    if (isCollaborationTableMissing(error)) return migrationError();
    if (error.code === "23505") {
      return { error: "Această adresă a fost deja invitată." };
    }
    console.error("inviteCollaborator:", error);
    return { error: "Nu am putut trimite invitația." };
  }

  const siteUrl = await getSiteUrl();
  const inviteUrl = `${siteUrl}/invite/${data.invite_token}`;

  await logEventActivity({
    eventId,
    action: "collaborator_invited",
    summary: `Invitație trimisă către ${normalizedEmail}`,
    metadata: { email: normalizedEmail, role, collaboratorId: data.id },
  });

  return { success: true, id: data.id, inviteUrl };
}

export async function updateCollaboratorRole(
  eventId: string,
  collaboratorId: string,
  role: CollaboratorRole
): Promise<CollaborationActionResult> {
  const auth = await assertManageCollaborators(eventId);
  if (!auth.ok) return { error: auth.error };

  if (!parseCollaboratorRole(role)) return { error: "Rol invalid." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_collaborators")
    .update({ role })
    .eq("id", collaboratorId)
    .eq("event_id", eventId)
    .select("email, user_id")
    .single();

  if (error) {
    if (isCollaborationTableMissing(error)) return migrationError();
    console.error("updateCollaboratorRole:", error);
    return { error: "Nu am putut actualiza rolul." };
  }

  await logEventActivity({
    eventId,
    action: "collaborator_role_changed",
    summary: `Rol actualizat pentru ${data.email}`,
    metadata: { email: data.email, role, collaboratorId },
  });

  revalidateCollaborationViews(eventId);

  return { success: true, id: collaboratorId };
}

export async function removeCollaborator(
  eventId: string,
  collaboratorId: string
): Promise<CollaborationActionResult> {
  const auth = await assertManageCollaborators(eventId);
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("event_collaborators")
    .select("email, user_id")
    .eq("id", collaboratorId)
    .eq("event_id", eventId)
    .maybeSingle();

  const { data: deleted, error } = await supabase
    .from("event_collaborators")
    .delete()
    .eq("id", collaboratorId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isCollaborationTableMissing(error)) return migrationError();
    console.error("removeCollaborator:", error);
    return { error: "Nu am putut elimina colaboratorul." };
  }

  if (!deleted) {
    return { error: "Colaboratorul nu a fost găsit." };
  }

  if (existing?.email) {
    await logEventActivity({
      eventId,
      action: "collaborator_removed",
      summary: `${existing.email} eliminat din echipă`,
      metadata: { email: existing.email, collaboratorId },
    });

    logAccessDecision({
      decision: "denied",
      source: "removeCollaborator",
      eventId,
      userId: existing.user_id,
      reason: "collaborator_removed",
    });
  }

  revalidateCollaborationViews(eventId);

  return { success: true };
}

export async function acceptCollaboratorInvite(
  token: string
): Promise<CollaborationActionResult & { eventId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Trebuie să fii autentificat pentru a accepta invitația." };
  }

  const { data: invite, error: fetchError } = await supabase
    .from("event_collaborators")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();

  if (fetchError || !invite) {
    return { error: "Invitația nu a fost găsită sau a expirat." };
  }

  if (invite.status !== "pending") {
    return { error: "Această invitație a fost deja procesată." };
  }

  if (normalizeCollaboratorEmail(user.email) !== normalizeCollaboratorEmail(invite.email)) {
    return {
      error: "Autentifică-te cu emailul care a primit invitația.",
    };
  }

  const { data: updated, error } = await supabase
    .from("event_collaborators")
    .update({
      status: "accepted",
      user_id: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .select("id, event_id, role, status, user_id")
    .maybeSingle();

  if (error) {
    if (isCollaborationTableMissing(error)) return migrationError();
    console.error("acceptCollaboratorInvite:", error);
    return { error: "Nu am putut accepta invitația." };
  }

  if (!updated || updated.status !== "accepted" || updated.user_id !== user.id) {
    return { error: "Nu am putut confirma acceptarea invitației." };
  }

  await logEventActivity({
    eventId: invite.event_id,
    action: "collaborator_accepted",
    summary: `${invite.email} s-a alăturat echipei`,
    metadata: { email: invite.email, role: invite.role },
    actorUserId: user.id,
  });

  logAccessDecision({
    decision: "granted",
    source: "acceptCollaboratorInvite",
    eventId: invite.event_id,
    userId: user.id,
    userEmail: user.email,
    role: updated.role,
    collaboratorStatus: updated.status,
  });

  revalidateCollaborationViews(invite.event_id);

  return { success: true, eventId: invite.event_id };
}

export async function declineCollaboratorInvite(
  token: string
): Promise<CollaborationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Trebuie să fii autentificat." };
  }

  const { data: invite } = await supabase
    .from("event_collaborators")
    .select("id, email, status, event_id")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return { error: "Invitația nu este validă." };
  }

  if (normalizeCollaboratorEmail(user.email) !== normalizeCollaboratorEmail(invite.email)) {
    return { error: "Autentifică-te cu emailul invitat." };
  }

  const { data: updated, error } = await supabase
    .from("event_collaborators")
    .update({
      status: "declined",
      user_id: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) {
    if (isCollaborationTableMissing(error)) return migrationError();
    return { error: "Nu am putut refuza invitația." };
  }

  if (!updated || updated.status !== "declined") {
    return { error: "Nu am putut confirma refuzul invitației." };
  }

  logAccessDecision({
    decision: "denied",
    source: "declineCollaboratorInvite",
    eventId: invite.event_id,
    userId: user.id,
    userEmail: user.email,
    collaboratorStatus: "declined",
    reason: "invite_declined",
  });

  revalidateCollaborationViews(invite.event_id);

  return { success: true };
}

export async function checkCollaborationMigrationReady(): Promise<boolean> {
  return checkCollaborationReady();
}
