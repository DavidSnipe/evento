import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { VendorPublicProfile } from "@/components/marketplace/vendor-public-profile";
import { getProfileForUser } from "@/lib/auth/profile";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import { getUserEvents } from "@/lib/events/queries";
import { getVendorBySlug } from "@/lib/marketplace/queries";
import { getServerUser } from "@/lib/supabase/server-auth";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

type VendorProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: VendorProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    return { title: ro.marketplace.seo.notFound };
  }

  const categoryLabel = getMarketplaceCategoryLabel(vendor.primary_category_slug ?? "other");
  const title = `${vendor.name} — ${categoryLabel} | Evento Marketplace`;
  const description =
    vendor.tagline?.trim() ||
    vendor.description?.trim().slice(0, 160) ||
    ro.marketplace.seo.homeDescription;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: vendor.cover_image_url ? [{ url: vendor.cover_image_url }] : undefined,
    },
  };
}

export default async function VendorProfilePage({ params }: VendorProfilePageProps) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const user = await getServerUser();
  const profile = user ? await getProfileForUser(user.id) : null;
  const events = user ? await getUserEvents() : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <VendorPublicProfile
        vendor={vendor}
        isLoggedIn={!!user}
        userName={profile?.full_name ?? user?.user_metadata?.full_name ?? null}
        userEmail={user?.email ?? null}
        events={events}
      />
    </div>
  );
}
