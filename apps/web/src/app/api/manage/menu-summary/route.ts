// GET /api/manage/menu-summary?site_id=<uuid>
//
// Lightweight summary for the qr_menu plan dashboard. Returns:
//   - scans_today     : distinct visitor_id today in the site's timezone
//   - scans_total     : all-time distinct visitor_id
//   - total_products  : count of products in this site's inventory
//   - total_categories: number of categories with at least one product
//   - categories      : [{ name, count }] for the per-category breakdown
//
// Cheap to call every 30s — the dashboard polls it like the paid insights
// route. Same auth pattern: Firebase ID token → user owns the site.

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth/verifyFirebaseToken';
import { supabaseServer } from '@/lib/platform/db/supabase-server';
import { summariseCategories } from '@/lib/menu/categorySummary';
import { logger } from '@/lib/platform/logger';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Returns the ISO timestamp of the start of *today* in the given IANA tz.
// We could use rangeFromSearchParams() but this is a much simpler call site —
// the qr_menu summary only ever cares about "today".
function startOfTodayIso(tz: string): string {
    const now = new Date();
    // Format current wall-clock date in the site's tz, then re-parse as the
    // UTC midnight equivalent. Falls back to UTC if Intl chokes on tz.
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(now);
        const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
        const ymd = `${get('year')}-${get('month')}-${get('day')}`;
        // Compute the UTC instant corresponding to 00:00 in that tz.
        const local = new Date(`${ymd}T00:00:00`);
        const localStr = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(local);
        // localStr is "MM/DD/YYYY, HH:mm:ss" in the site tz. Diff against
        // our "wall clock midnight" to find the offset, then subtract.
        const m = localStr.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
        if (!m) return local.toISOString();
        const tzWallMs = Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]);
        const offset = tzWallMs - local.getTime();
        return new Date(local.getTime() - offset).toISOString();
    } catch {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d.toISOString();
    }
}

/**
 * Distinct visitors today and all-time, counted by Postgres (migration 066).
 *
 * The old way — fetch every visitor_id row and dedupe here — grew with the
 * store's age on every 30 s poll and undercounted past PostgREST's 1,000-row
 * cap. It remains only as the fallback for a database without 066, so the
 * deploy and the migration can land in either order.
 */
async function visitorCounts(siteId: string, sinceIso: string): Promise<{ today: number; total: number }> {
    const { data, error } = await supabaseServer.rpc('menu_scan_counts', { p_site_id: siteId, p_since: sinceIso });
    if (!error) {
        const row = (Array.isArray(data) ? data[0] : data) as { today?: number | string; total?: number | string } | null;
        return { today: Number(row?.today ?? 0), total: Number(row?.total ?? 0) };
    }
    if (error.code !== 'PGRST202') {
        logger.warn('[menu-summary] menu_scan_counts failed, counting rows instead', error);
    }

    const [scansToday, scansTotal] = await Promise.all([
        supabaseServer.from('menu_scans').select('visitor_id').eq('site_id', siteId).gte('scanned_at', sinceIso),
        supabaseServer.from('menu_scans').select('visitor_id').eq('site_id', siteId),
    ]);
    const distinct = (rows: Array<{ visitor_id: string }> | null) => new Set((rows ?? []).map(r => r.visitor_id)).size;
    return { today: distinct(scansToday.data), total: distinct(scansTotal.data) };
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = await verifyFirebaseToken(authHeader.replace('Bearer ', ''));
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const url = new URL(request.url);
    const siteId = url.searchParams.get('site_id');
    if (!siteId || !/^[0-9a-f-]{36}$/i.test(siteId)) {
        return NextResponse.json({ error: 'site_id is required' }, { status: 400 });
    }

    // Verify ownership + fetch timezone in one query.
    const { data: site } = await supabaseServer
        .from('sites')
        .select('id, timezone')
        .eq('id', siteId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!site) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tz = site.timezone ?? 'Asia/Kolkata';
    const todayIso = startOfTodayIso(tz);

    const [visitors, products] = await Promise.all([
        visitorCounts(siteId, todayIso),
        supabaseServer
            .from('products')
            .select('category')
            .eq('site_id', siteId),
    ]);

    // Per-category breakdown. Products without a category roll up to
    // "Uncategorized". `total_categories` and `total_groups` are both returned
    // because the dashboard renders both at once and they are not the same
    // number — see lib/menu/categorySummary.ts.
    const { categories, totalNamedCategories, totalGroups } =
        summariseCategories((products.data ?? []) as { category: string | null }[]);

    return NextResponse.json(
        {
            scans_today:      visitors.today,
            scans_total:      visitors.total,
            total_products:   products.data?.length ?? 0,
            total_categories: totalNamedCategories,
            total_groups:     totalGroups,
            categories,
            generated_at:     new Date().toISOString(),
        },
        { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } },
    );
}
