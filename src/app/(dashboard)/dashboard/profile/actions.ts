"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getProfileForUser } from "@/lib/auth/profile";
import { clearProfileCacheFromStore } from "@/lib/auth/profile-cache";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/marketplace";

export type ProfileActionResult = {
  ok: boolean;
  error?: string;
  success?: string;
};

export type MyProfileData = {
  user: User;
  profile: Profile | null;
};

export async function getMyProfile(): Promise<MyProfileData | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await getProfileForUser(user.id);
  return { user, profile };
}

export async function updateProfile(data: {
  full_name: string;
  phone?: string | null;
}): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Neautentificat." };
  }

  const full_name = data.full_name.trim();
  if (!full_name) {
    return { ok: false, error: "Numele complet este obligatoriu." };
  }

  const phone = data.phone?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[updateProfile]", error.message);
    return { ok: false, error: "Nu am putut actualiza profilul." };
  }

  await supabase.auth.updateUser({
    data: { full_name },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard/profile");

  return { ok: true, success: "Profil actualizat" };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Neautentificat." };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: "Parola nouă trebuie să aibă cel puțin 8 caractere." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { ok: false, error: "Parola curentă este incorectă" };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    console.error("[changePassword]", error.message);
    return { ok: false, error: "Nu am putut actualiza parola." };
  }

  return { ok: true, success: "Parola a fost schimbată cu succes" };
}

export async function signOutGlobal() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  await clearProfileCacheFromStore();
  revalidatePath("/", "layout");
  redirect("/login");
}
