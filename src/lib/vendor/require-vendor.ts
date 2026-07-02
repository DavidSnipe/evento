import { redirect } from "next/navigation";

import { getProfileFlagsForUser } from "@/lib/auth/profile";
import { getServerUser } from "@/lib/supabase/server-auth";

import { getMyVendorProfileByUserId, type VendorPortalDetail } from "./queries";

export type VendorPortalContext = {
  userId: string;
  userEmail: string | null;
  isPlanner: boolean;
  isVendor: boolean;
  vendor: VendorPortalDetail | null;
};

export async function requireVendorUser(): Promise<{
  userId: string;
  userEmail: string | null;
  isPlanner: boolean;
}> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const flags = await getProfileFlagsForUser(user.id);
  if (!flags?.is_vendor) redirect("/dashboard?notice=vendor_required");

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    isPlanner: flags.is_planner,
  };
}

export async function getVendorPortalContext(): Promise<VendorPortalContext> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const flags = await getProfileFlagsForUser(user.id);
  if (!flags?.is_vendor) redirect("/dashboard?notice=vendor_required");

  const vendor = await getMyVendorProfileByUserId(user.id);

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    isPlanner: flags.is_planner,
    isVendor: flags.is_vendor,
    vendor,
  };
}

export async function requireMyVendor(): Promise<VendorPortalContext & { vendor: VendorPortalDetail }> {
  const ctx = await getVendorPortalContext();
  if (!ctx.vendor) redirect("/vendor/dashboard");
  return { ...ctx, vendor: ctx.vendor };
}
