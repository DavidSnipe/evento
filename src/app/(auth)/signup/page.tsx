import Link from "next/link";
import { Heart } from "lucide-react";

import { SignupForm } from "@/components/auth/signup-form";
import { SupabaseEnvBanner } from "@/components/auth/supabase-env-banner";
import { signUp } from "@/app/(auth)/actions";
import type { SignupAccountRole } from "@/lib/auth/signup-role";

type SignupPageProps = {
  searchParams: Promise<{ role?: string }>;
};

function parseDefaultRole(role?: string): SignupAccountRole {
  if (role === "vendor" || role === "both" || role === "planner") return role;
  return "planner";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { role } = await searchParams;
  const defaultRole = parseDefaultRole(role);
  const googleRole =
    role === "vendor" || role === "both" ? defaultRole : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[hsl(40,33%,98%)] via-[hsl(350,28%,96%)] to-[hsl(30,28%,92%)] px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground">
        <Heart className="h-6 w-6 fill-primary/30 text-primary" />
        <span className="font-serif text-2xl font-semibold">Evento</span>
      </Link>
      <SupabaseEnvBanner />
      <SignupForm action={signUp} defaultRole={defaultRole} googleRole={googleRole} />
    </div>
  );
}
