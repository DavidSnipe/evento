export type SignupAccountRole = "planner" | "vendor" | "both";

export type ProfileRoleFlags = {
  is_planner: boolean;
  is_vendor: boolean;
};

export function parseSignupAccountRole(value: unknown): SignupAccountRole | null {
  if (value === "planner" || value === "vendor" || value === "both") {
    return value;
  }
  return null;
}

export function roleToProfileFlags(role: SignupAccountRole): ProfileRoleFlags {
  switch (role) {
    case "planner":
      return { is_planner: true, is_vendor: false };
    case "vendor":
      return { is_planner: false, is_vendor: true };
    case "both":
      return { is_planner: true, is_vendor: true };
  }
}

export function resolvePostAuthRedirect(
  flags: ProfileRoleFlags,
  options?: { showVendorHint?: boolean }
): string {
  if (flags.is_vendor && !flags.is_planner) {
    return "/vendor/dashboard";
  }

  if (flags.is_planner && flags.is_vendor && options?.showVendorHint) {
    return "/dashboard?vendor_hint=1";
  }

  return "/dashboard";
}
