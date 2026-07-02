-- Rate-limit check for public quote requests (anon cannot SELECT under RLS)

CREATE OR REPLACE FUNCTION public.check_quote_request_rate_limit(
  p_email text,
  p_vendor_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marketplace_quote_requests
    WHERE lower(trim(requester_email)) = lower(trim(p_email))
      AND vendor_id = p_vendor_id
      AND created_at > now() - interval '24 hours'
  );
$$;

REVOKE ALL ON FUNCTION public.check_quote_request_rate_limit(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_quote_request_rate_limit(text, uuid) TO anon, authenticated;
