import Link from "next/link";

import { AdminVendorsTable } from "@/components/admin/admin-vendors-table";
import { PageHeader } from "@/components/nuntiki/page-header";
import { Button } from "@/components/ui/button";
import {
  getAdminVendorCategories,
  getAdminVendorCityOptions,
  getAdminVendorsList,
} from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.admin.vendors.title,
};

type AdminVendorsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    status?: string;
  }>;
};

export default async function AdminVendorsPage({ searchParams }: AdminVendorsPageProps) {
  await requireAdmin();
  const filters = await searchParams;

  const [vendors, categories, cities] = await Promise.all([
    getAdminVendorsList({
      q: filters.q,
      category: filters.category,
      city: filters.city,
      status: filters.status as "published" | "unpublished" | "featured" | undefined,
    }),
    getAdminVendorCategories(),
    getAdminVendorCityOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ro.admin.vendors.title}
        description={ro.admin.vendors.description}
        actions={
          <Button asChild>
            <Link href="/admin/vendors/new">{ro.admin.vendors.add}</Link>
          </Button>
        }
      />
      <AdminVendorsTable
        vendors={vendors}
        categories={categories}
        cities={cities}
        initialFilters={filters}
      />
    </div>
  );
}
