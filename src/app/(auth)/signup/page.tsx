import Link from "next/link";
import { Heart } from "lucide-react";

import { signUp } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { SupabaseEnvBanner } from "@/components/auth/supabase-env-banner";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[hsl(40,33%,98%)] via-[hsl(350,28%,96%)] to-[hsl(30,28%,92%)] px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground">
        <Heart className="h-6 w-6 fill-primary/30 text-primary" />
        <span className="font-serif text-2xl font-semibold">Evento</span>
      </Link>
      <SupabaseEnvBanner />
      <AuthForm mode="signup" action={signUp} />
    </div>
  );
}
