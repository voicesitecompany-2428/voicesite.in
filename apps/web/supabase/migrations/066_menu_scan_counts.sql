-- 066 — Menu visitor counts computed in the database (2026-10-09)
--
-- GET /api/manage/menu-summary (polled every 30 s by the dashboard) fetched
-- every menu_scans row a store ever recorded and deduplicated visitor_id in
-- JavaScript. One row is written per menu load, so the payload grew with the
-- store's age forever, and past PostgREST's max-rows (1,000) "Total Visitors"
-- was silently undercounted. This function returns two numbers instead.
--
-- Expand-only: one new function and one new index. Nothing is altered or
-- dropped. The route falls back to the old row count while this function does
-- not exist, so the deploy and this migration can happen in either order.
--
-- Called only by the server (service_role); never with the public key.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.menu_scan_counts(uuid, timestamptz);
--   DROP INDEX IF EXISTS public.menu_scans_site_visitor_idx;

-- Covers both counts with an index-only scan: the site's rows, their visitor,
-- and the time "today" is filtered on. menu_scans is small (hundreds of rows
-- per store), so building it inside the migration's transaction is brief.
CREATE INDEX IF NOT EXISTS menu_scans_site_visitor_idx
    ON public.menu_scans (site_id, visitor_id, scanned_at);

CREATE OR REPLACE FUNCTION public.menu_scan_counts(p_site_id uuid, p_since timestamptz)
RETURNS TABLE (today bigint, total bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT
        count(DISTINCT visitor_id) FILTER (WHERE scanned_at >= p_since) AS today,
        count(DISTINCT visitor_id) AS total
    FROM public.menu_scans
    WHERE site_id = p_site_id;
$$;

REVOKE ALL ON FUNCTION public.menu_scan_counts(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.menu_scan_counts(uuid, timestamptz) TO service_role;
