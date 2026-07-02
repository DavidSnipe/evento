"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, PartyPopper } from "lucide-react";

import {
  EVENTO_MODE_STORAGE_KEY,
  accountModeFromPath,
  dashboardPathForMode,
  type AccountMode,
} from "@/lib/auth/account-mode";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type AccountModeSwitcherProps = {
  isPlanner: boolean;
  isVendor: boolean;
  collapsed?: boolean;
};

export function AccountModeSwitcher({
  isPlanner,
  isVendor,
  collapsed = false,
}: AccountModeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentMode = accountModeFromPath(pathname);

  useEffect(() => {
    const stored = localStorage.getItem(EVENTO_MODE_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(EVENTO_MODE_STORAGE_KEY, currentMode);
    }
  }, [currentMode]);

  if (!isVendor) {
    return null;
  }

  const switchMode = (mode: AccountMode) => {
    if (mode === "planner" && !isPlanner) return;
    if (mode === "vendor" && !isVendor) return;

    localStorage.setItem(EVENTO_MODE_STORAGE_KEY, mode);
    router.push(dashboardPathForMode(mode));
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => switchMode(currentMode === "planner" ? "vendor" : "planner")}
        className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] text-[var(--dash-accent-text)] shadow-[var(--dash-shadow-sm)]"
        title={
          currentMode === "planner"
            ? ro.auth.modeSwitch.switchToVendor
            : ro.auth.modeSwitch.switchToPlanner
        }
        aria-label={
          currentMode === "planner"
            ? ro.auth.modeSwitch.switchToVendor
            : ro.auth.modeSwitch.switchToPlanner
        }
      >
        {currentMode === "planner" ? (
          <PartyPopper className="h-4 w-4" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <div className="mx-3 mb-4 rounded-[14px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-1.5 shadow-[var(--dash-shadow-sm)]">
      <p className="dash-type-micro mb-2 px-2">{ro.auth.modeSwitch.label}</p>
      <div className="grid grid-cols-2 gap-1">
        {isPlanner ? (
          <ModeButton
            active={currentMode === "planner"}
            label={ro.auth.modeSwitch.planner}
            icon={PartyPopper}
            onClick={() => switchMode("planner")}
          />
        ) : null}
        <ModeButton
          active={currentMode === "vendor"}
          label={ro.auth.modeSwitch.vendor}
          icon={Building2}
          onClick={() => switchMode("vendor")}
          className={!isPlanner ? "col-span-2" : undefined}
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  label,
  icon: Icon,
  onClick,
  className,
}: {
  active: boolean;
  label: string;
  icon: typeof PartyPopper;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-[11px] font-semibold transition",
        active
          ? "bg-[var(--dash-blush)]/55 text-[var(--dash-accent-text)] shadow-sm"
          : "text-[var(--dash-text-secondary)] hover:bg-[var(--dash-blush)]/20 hover:text-[var(--dash-text)]",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
