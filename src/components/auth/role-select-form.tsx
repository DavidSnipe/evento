"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Building2, PartyPopper, Sparkles } from "lucide-react";

import type { AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignupAccountRole } from "@/lib/auth/signup-role";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type RoleSelectFormProps = {
  action: (prevState: AuthState, formData: FormData) => Promise<AuthState>;
};

const initialState: AuthState = {};

const roleOptions: {
  value: SignupAccountRole;
  icon: typeof PartyPopper;
  title: string;
  description: string;
}[] = [
  {
    value: "planner",
    icon: PartyPopper,
    title: ro.auth.signupRole.plannerTitle,
    description: ro.auth.signupRole.plannerDesc,
  },
  {
    value: "vendor",
    icon: Building2,
    title: ro.auth.signupRole.vendorTitle,
    description: ro.auth.signupRole.vendorDesc,
  },
  {
    value: "both",
    icon: Sparkles,
    title: ro.auth.signupRole.bothTitle,
    description: ro.auth.signupRole.bothDesc,
  },
];

export function RoleSelectForm({ action }: RoleSelectFormProps) {
  const [accountRole, setAccountRole] = useState<SignupAccountRole>("planner");
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="glass-panel w-full max-w-lg border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">{ro.auth.signupRole.selectTitle}</CardTitle>
        <CardDescription>{ro.auth.signupRole.selectSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="account_role" value={accountRole} />

          <div className="grid gap-3">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const selected = accountRole === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccountRole(option.value)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    selected
                      ? "border-primary/40 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background/60 hover:border-primary/25 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{option.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {state.error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? ro.auth.pleaseWait : ro.auth.signupRole.selectContinue}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
