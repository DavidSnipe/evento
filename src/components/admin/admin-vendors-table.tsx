"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import {
  bulkDeleteVendors,
  bulkPublishVendors,
  bulkUnpublishVendors,
} from "@/app/(admin)/admin/vendors/actions";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import type { AdminVendorListRow } from "@/lib/admin/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";

type AdminVendorsTableProps = {
  vendors: AdminVendorListRow[];
  categories: VendorCategoryRow[];
  cities: string[];
  initialFilters: {
    q?: string;
    category?: string;
    city?: string;
    status?: string;
  };
};

export function AdminVendorsTable({
  vendors,
  categories,
  cities,
  initialFilters,
}: AdminVendorsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initialFilters.q ?? "");
  const [category, setCategory] = useState(initialFilters.category ?? "");
  const [city, setCity] = useState(initialFilters.city ?? "");
  const [status, setStatus] = useState(initialFilters.status ?? "");

  const allSelected = vendors.length > 0 && selected.size === vendors.length;

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (status) params.set("status", status);
    router.push(`/admin/vendors?${params.toString()}`);
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(vendors.map((v) => v.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const runBulk = (type: "publish" | "unpublish" | "delete") => {
    if (selectedIds.length === 0) return;
    if (type === "delete" && !window.confirm(ro.admin.vendors.deleteConfirm)) return;
    startTransition(async () => {
      if (type === "publish") await bulkPublishVendors(selectedIds);
      else if (type === "unpublish") await bulkUnpublishVendors(selectedIds);
      else await bulkDeleteVendors(selectedIds);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-[var(--dash-hairline)] bg-white p-4">
        <div className="min-w-[180px] flex-1">
          <Input
            placeholder={ro.admin.vendors.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{ro.admin.vendors.filterCategory}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {getMarketplaceCategoryLabel(c.slug)}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">{ro.admin.vendors.filterCity}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{ro.admin.vendors.statusAll}</option>
          <option value="published">{ro.admin.vendors.statusPublished}</option>
          <option value="unpublished">{ro.admin.vendors.statusUnpublished}</option>
          <option value="featured">{ro.admin.vendors.statusFeatured}</option>
        </select>
        <Button type="button" variant="secondary" onClick={applyFilters}>
          Filtrează
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || selectedIds.length === 0}
          onClick={() => runBulk("publish")}
        >
          {ro.admin.vendors.bulkPublish}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || selectedIds.length === 0}
          onClick={() => runBulk("unpublish")}
        >
          {ro.admin.vendors.bulkUnpublish}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || selectedIds.length === 0}
          onClick={() => runBulk("delete")}
        >
          {ro.admin.vendors.bulkDelete}
        </Button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[var(--dash-hairline)] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selectează toate"
                />
              </TableHead>
              <TableHead>{ro.admin.vendors.columns.logo}</TableHead>
              <TableHead>{ro.admin.vendors.columns.name}</TableHead>
              <TableHead>{ro.admin.vendors.columns.categories}</TableHead>
              <TableHead>{ro.admin.vendors.columns.city}</TableHead>
              <TableHead>{ro.admin.vendors.columns.status}</TableHead>
              <TableHead>{ro.admin.vendors.columns.reviews}</TableHead>
              <TableHead>{ro.admin.vendors.columns.created}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {ro.admin.vendors.empty}
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(vendor.id)}
                      onChange={() => toggleOne(vendor.id)}
                      aria-label={`Selectează ${vendor.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {vendor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={vendor.logo_url}
                        alt=""
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                        {vendor.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="font-medium hover:text-[var(--dash-accent-text)]"
                    >
                      {vendor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal">
                    {vendor.category_slugs.map((slug) => (
                      <Badge key={slug} variant="outline" className="mr-1 mb-1">
                        {getMarketplaceCategoryLabel(slug)}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>{vendor.location_city ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={vendor.is_published ? "default" : "secondary"}>
                        {vendor.is_published
                          ? ro.admin.vendors.published
                          : ro.admin.vendors.unpublished}
                      </Badge>
                      {vendor.is_featured ? (
                        <Badge variant="outline">{ro.admin.vendors.featured}</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {vendor.review_count}
                    {vendor.review_avg != null ? ` · ${vendor.review_avg}` : ""}
                  </TableCell>
                  <TableCell>
                    {new Date(vendor.created_at).toLocaleDateString("ro-RO")}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" asChild>
                      <Link href={`/admin/vendors/${vendor.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
