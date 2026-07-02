import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

type MarketplacePaginationProps = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath?: string;
};

function buildPageHref(
  page: number,
  searchParams: Record<string, string | string[] | undefined>,
  basePath: string
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function MarketplacePagination({
  page,
  totalPages,
  searchParams,
  basePath = "/marketplace",
}: MarketplacePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {ro.marketplace.pagination.page
          .replace("{page}", String(page))
          .replace("{total}", String(totalPages))}
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" disabled={page <= 1}>
          <Link
            href={page > 1 ? buildPageHref(page - 1, searchParams, basePath) : "#"}
            aria-disabled={page <= 1}
          >
            {ro.marketplace.pagination.prev}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
          <Link
            href={page < totalPages ? buildPageHref(page + 1, searchParams, basePath) : "#"}
            aria-disabled={page >= totalPages}
          >
            {ro.marketplace.pagination.next}
          </Link>
        </Button>
      </div>
    </div>
  );
}
