import { MarketplaceFooter } from "@/components/marketplace/marketplace-footer";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { getProfileFlagsForUser } from "@/lib/auth/profile";
import { resolvePostAuthRedirect } from "@/lib/auth/signup-role";
import { getServerUser } from "@/lib/supabase/server-auth";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  const profile = user ? await getProfileFlagsForUser(user.id) : null;
  const panelHref = user
    ? resolvePostAuthRedirect({
        is_planner: profile?.is_planner ?? true,
        is_vendor: profile?.is_vendor ?? false,
      })
    : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketplaceHeader isLoggedIn={!!user} panelHref={panelHref} />
      <main className="flex-1">{children}</main>
      <MarketplaceFooter />
    </div>
  );
}
