"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { Building2, PartyPopper, Sparkles } from "lucide-react";

import type { AuthState } from "@/app/(auth)/actions";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { SignupAccountRole } from "@/lib/auth/signup-role";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type SignupFormProps = {
  action: (prevState: AuthState, formData: FormData) => Promise<AuthState>;
  defaultRole?: SignupAccountRole;
  googleRole?: SignupAccountRole;
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

export function SignupForm({
  action,
  defaultRole = "planner",
  googleRole,
}: SignupFormProps) {
  const [step, setStep] = useState<1 | 2>(defaultRole === "vendor" || defaultRole === "both" ? 2 : 1);
  const [accountRole, setAccountRole] = useState<SignupAccountRole>(defaultRole);
  const [draft, setDraft] = useState({ fullName: "", email: "", password: "" });
  const [state, formAction, pending] = useActionState(action, initialState);

  const canContinue =
    draft.fullName.trim().length > 0 &&
    draft.email.trim().length > 0 &&
    draft.password.length >= 8;

  return (
    <Card className="glass-panel w-full max-w-lg border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">{ro.auth.createAccount}</CardTitle>
        <CardDescription>
          {step === 1 ? ro.auth.signupDesc : ro.auth.signupRole.title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 ? (
          <>
            <form action={signInWithGoogle}>
              {googleRole ? <input type="hidden" name="role" value={googleRole} /> : null}
              <Button type="submit" variant="outline" className="w-full gap-2">
                <GoogleIcon />
                {ro.auth.continueWithGoogle}
              </Button>
            </form>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                {ro.auth.orContinueWith}
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{ro.auth.fullName}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder={ro.auth.fullNamePlaceholder}
                  autoComplete="name"
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{ro.auth.email}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={ro.auth.emailPlaceholder}
                  autoComplete="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{ro.auth.password}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  value={draft.password}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!canContinue}
                onClick={() => setStep(2)}
              >
                {ro.auth.signupRole.continue}
              </Button>
            </div>
          </>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="fullName" value={draft.fullName} />
            <input type="hidden" name="email" value={draft.email} />
            <input type="hidden" name="password" value={draft.password} />
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
            {state.success ? (
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
                {state.success}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                {ro.auth.signupRole.back}
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? ro.auth.pleaseWait : ro.auth.createAccountBtn}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {ro.auth.hasAccount}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {ro.auth.signInLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
