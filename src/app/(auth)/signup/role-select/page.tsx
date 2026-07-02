import Link from "next/link";
import { Heart } from "lucide-react";
import { redirect } from "next/navigation";

import { RoleSelectForm } from "@/components/auth/role-select-form";
import { SupabaseEnvBanner } from "@/components/auth/supabase-env-banner";
import { selectSignupRole } from "@/app/(auth)/actions";
import { parseSignupAccountRole } from "@/lib/auth/signup-role";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Alege tipul de cont | Evento",
};

export default async function RoleSelectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const metadataRole = parseSignupAccountRole(user.user_metadata?.account_role);
  if (metadataRole) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[hsl(40,33%,98%)] via-[hsl(350,28%,96%)] to-[hsl(30,28%,92%)] px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground">
        <Heart className="h-6 w-6 fill-primary/30 text-primary" />
        <span className="font-serif text-2xl font-semibold">Evento</span>
      </Link>
      <SupabaseEnvBanner />
      <RoleSelectForm action={selectSignupRole} />
    </div>
  );
}
