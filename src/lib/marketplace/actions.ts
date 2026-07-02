"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/server-auth";

export type MarketplaceActionResult = { ok: boolean; error?: string };

export type CreateQuoteRequestInput = {
  vendor_id: string;
  package_id?: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone?: string | null;
  event_date?: string | null;
  event_location?: string | null;
  guest_count?: number | null;
  message: string;
  event_id?: string | null;
  website?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createQuoteRequest(
  input: CreateQuoteRequestInput
): Promise<MarketplaceActionResult> {
  if (input.website?.trim()) {
    return { ok: true };
  }

  const name = input.requester_name.trim();
  const email = input.requester_email.trim().toLowerCase();
  const message = input.message.trim();

  if (name.length < 2) {
    return { ok: false, error: "Numele trebuie să aibă cel puțin 2 caractere." };
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Adresa de email nu este validă." };
  }
  if (message.length < 20) {
    return { ok: false, error: "Mesajul trebuie să aibă cel puțin 20 de caractere." };
  }

  const user = await getServerUser();
  const supabase = await createClient();

  const { data: rateLimited, error: rateLimitError } = await supabase.rpc(
    "check_quote_request_rate_limit",
    {
      p_email: email,
      p_vendor_id: input.vendor_id,
    }
  );

  if (rateLimitError) {
    console.error("[createQuoteRequest] rate limit", rateLimitError);
  } else if (rateLimited) {
    return {
      ok: false,
      error:
        "Ai trimis deja o cerere acestui furnizor. Te rugăm să aștepți răspunsul.",
    };
  }

  if (input.event_id && user) {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", input.event_id)
      .maybeSingle();
    if (!event) return { ok: false, error: "Eveniment invalid." };
  }

  const { data: vendor } = await supabase
    .from("marketplace_vendors")
    .select("id, slug")
    .eq("id", input.vendor_id)
    .eq("is_published", true)
    .maybeSingle();

  if (!vendor) return { ok: false, error: "Furnizorul nu este disponibil." };

  const { error } = await supabase.from("marketplace_quote_requests").insert({
    vendor_id: input.vendor_id,
    requester_id: user?.id ?? null,
    event_id: user && input.event_id ? input.event_id : null,
    requester_name: name,
    requester_email: email,
    requester_phone: input.requester_phone?.trim() || null,
    event_date: input.event_date || null,
    event_location: input.event_location?.trim() || null,
    guest_count: input.guest_count ?? null,
    package_id: input.package_id || null,
    message,
    status: "pending",
  });

  if (error) {
    console.error("[createQuoteRequest]", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/vendor/requests");
  revalidatePath(`/marketplace/${vendor.slug}`);
  return { ok: true };
}

export type CreateReviewInput = {
  vendor_id: string;
  rating: number;
  title?: string | null;
  body: string;
  reviewer_name: string;
  event_year?: number | null;
};

export async function createReview(input: CreateReviewInput): Promise<MarketplaceActionResult> {
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Trebuie să fii autentificat pentru a lăsa o recenzie." };

  const body = input.body.trim();
  const reviewerName = input.reviewer_name.trim();

  if (input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Rating invalid." };
  }
  if (!reviewerName) return { ok: false, error: "Numele afișat este obligatoriu." };
  if (body.length < 50) {
    return { ok: false, error: "Recenzia trebuie să aibă cel puțin 50 de caractere." };
  }

  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("marketplace_vendors")
    .select("slug")
    .eq("id", input.vendor_id)
    .eq("is_published", true)
    .maybeSingle();

  if (!vendor) return { ok: false, error: "Furnizorul nu este disponibil." };

  const { error } = await supabase.from("marketplace_vendor_reviews").insert({
    vendor_id: input.vendor_id,
    reviewer_id: user.id,
    rating: input.rating,
    title: input.title?.trim() || null,
    body,
    reviewer_name: reviewerName,
    event_year: input.event_year ?? null,
    is_approved: false,
  });

  if (error) {
    console.error("[createReview]", error);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/marketplace/${vendor.slug}`);
  return { ok: true };
}
