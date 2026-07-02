"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import { Check, Copy, LogOut, Shield } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import {
  changePassword,
  signOutGlobal,
  updateProfile,
  type ProfileActionResult,
} from "@/app/(dashboard)/dashboard/profile/actions";
import { SectionCard } from "@/components/nuntiki/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/marketplace";

type ProfilePageContentProps = {
  user: User;
  profile: Profile | null;
};

function getDisplayName(user: User, profile: Profile | null): string {
  return (
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ||
    user.email ||
    ro.nav.guest
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatLastSignIn(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyUserIdButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-blush)]/25 hover:text-[var(--dash-text)]"
      title={ro.profile.copyId}
      aria-label={ro.profile.copyId}
    >
      {copied ? <Check className="h-3 w-3 text-[var(--dash-sage)]" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ActionMessage({ result }: { result: ProfileActionResult | null }) {
  if (!result) return null;
  if (result.success) {
    return (
      <p className="rounded-lg bg-[var(--dash-sage)]/15 px-3 py-2 text-sm text-[var(--dash-sage)]">
        {result.success}
      </p>
    );
  }
  if (result.error) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{result.error}</p>
    );
  }
  return null;
}

export function ProfilePageContent({ user, profile }: ProfilePageContentProps) {
  const router = useRouter();
  const displayName = getDisplayName(user, profile);
  const initials = getInitials(displayName);

  const [fullName, setFullName] = useState(displayName);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [profileResult, setProfileResult] = useState<ProfileActionResult | null>(null);
  const [passwordResult, setPasswordResult] = useState<ProfileActionResult | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [globalSignOutPending, startGlobalSignOut] = useTransition();

  const isPlanner = profile?.is_planner ?? true;
  const isVendor = profile?.is_vendor ?? false;
  const isAdmin = profile?.is_admin ?? false;

  const handleProfileSave = (event: React.FormEvent) => {
    event.preventDefault();
    setProfileResult(null);
    startProfileTransition(async () => {
      const result = await updateProfile({ full_name: fullName, phone: phone || null });
      setProfileResult(result);
      if (result.ok) router.refresh();
    });
  };

  const handlePasswordChange = (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordResult(null);

    if (newPassword !== confirmPassword) {
      setPasswordResult({ ok: false, error: ro.profile.passwordMismatch });
      return;
    }

    startPasswordTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);
      setPasswordResult(result);
      if (result.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleProfileSave} className="space-y-6">
        <SectionCard title={ro.profile.sections.identity}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-16 w-16 shrink-0 border border-[var(--dash-hairline)] bg-[var(--dash-surface)]">
              <AvatarFallback className="bg-[var(--dash-blush)]/40 text-base font-semibold text-[var(--dash-accent-text)]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-full-name" className="text-xs text-[var(--dash-text-muted)]">
                  {ro.profile.fullName}
                </Label>
                <Input
                  id="profile-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 border-[var(--dash-hairline)] bg-white/80 text-base font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-[var(--dash-text-muted)]">{ro.profile.email}</p>
                <p className="text-sm text-[var(--dash-text)]">{user.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs text-[var(--dash-text-muted)]">
                  {ro.profile.accountId}: {user.id}
                </span>
                <CopyUserIdButton userId={user.id} />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-[var(--dash-text-muted)]">{ro.profile.accountType}</p>
                <div className="flex flex-wrap gap-2">
                  {isPlanner ? (
                    <Badge
                      variant="outline"
                      className="border-[var(--dash-hairline)] bg-[var(--dash-surface)] text-[var(--dash-text-secondary)]"
                    >
                      🎉 {ro.profile.rolePlanner}
                    </Badge>
                  ) : null}
                  {isVendor ? (
                    <Badge
                      variant="outline"
                      className="border-[var(--dash-hairline)] bg-[var(--dash-surface)] text-[var(--dash-text-secondary)]"
                    >
                      🏢 {ro.profile.roleVendor}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={ro.profile.sections.edit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-phone">{ro.profile.phone}</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={ro.profile.phonePlaceholder}
                autoComplete="tel"
                className="border-[var(--dash-hairline)] bg-white/80"
              />
            </div>

            <ActionMessage result={profileResult} />

            <Button
              type="submit"
              disabled={profilePending}
              className="bg-[var(--dash-accent-text)] text-white hover:bg-[var(--dash-accent-text)]/90"
            >
              {profilePending ? ro.profile.saving : ro.profile.saveChanges}
            </Button>
          </div>
        </SectionCard>
      </form>

      <SectionCard title={ro.profile.sections.security}>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{ro.profile.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="border-[var(--dash-hairline)] bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{ro.profile.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="border-[var(--dash-hairline)] bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{ro.profile.confirmPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="border-[var(--dash-hairline)] bg-white/80"
            />
          </div>

          <ActionMessage result={passwordResult} />

          <Button
            type="submit"
            variant="outline"
            disabled={passwordPending}
            className="border-[var(--dash-hairline)]"
          >
            {passwordPending ? ro.profile.updatingPassword : ro.profile.updatePassword}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title={ro.profile.sections.session}>
        <div className="space-y-4">
          <div className="space-y-1 text-sm text-[var(--dash-text-secondary)]">
            <p>
              {ro.profile.signedInAs}{" "}
              <span className="font-medium text-[var(--dash-text)]">{user.email}</span>
            </p>
            <p>
              {ro.profile.lastSignIn}{" "}
              <span className="font-medium text-[var(--dash-text)]">
                {formatLastSignIn(user.last_sign_in_at)}
              </span>
            </p>
          </div>

          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="w-full border-[var(--dash-hairline)] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {ro.nav.signOut}
            </Button>
          </form>

          <button
            type="button"
            disabled={globalSignOutPending}
            onClick={() => startGlobalSignOut(() => signOutGlobal())}
            className={cn(
              "text-xs text-[var(--dash-text-muted)] underline-offset-2 hover:text-[var(--dash-text)] hover:underline",
              globalSignOutPending && "pointer-events-none opacity-60"
            )}
          >
            {ro.profile.signOutAllDevices}
          </button>
        </div>
      </SectionCard>

      {isAdmin ? (
        <SectionCard
          title={ro.profile.sections.admin}
          className="border-[var(--dash-sage)]/50 bg-gradient-to-br from-[var(--dash-sage)]/10 to-white/90"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--dash-text-secondary)]">{ro.profile.adminDescription}</p>
            <Button
              asChild
              className="bg-[var(--dash-sage)] text-white hover:bg-[var(--dash-sage)]/90"
            >
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                {ro.profile.openAdminPanel}
              </Link>
            </Button>
            <div className="rounded-[12px] border border-[var(--dash-sage)]/30 bg-white/60 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--dash-sage)]">
                {ro.profile.adminId}
              </p>
              <p className="mt-1 break-all font-mono text-sm text-[var(--dash-text)]">{user.id}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
