/**
 * Acceptance: data hygiene before launch (`data-hygiene`, 2026-10-09).
 *
 * Four things the owner asked to have fixed at production level:
 *
 *   AC1–AC2  "Total Visitors" read every scan row a store ever had on each 30 s
 *            dashboard poll, deduped in JS, and silently undercounted past
 *            PostgREST's 1,000-row cap. One database function now counts.
 *   AC3–AC6  Veg dishes showed meat photos. Live DB, 2026-10-09: 89 dishes the
 *            owner marked veg carry a non-veg library photo ("Kadala Curry" →
 *            chicken curry, "Veg Fried Rice" → chicken rice). Two causes: bulk
 *            upload still ran the old embedding matcher with no diet gate, and
 *            the concept matcher only knew a dish's diet from its NAME —
 *            "Kadala Curry" names no ingredient it knows, so any curry would do.
 *            The dish's own veg/egg/non-veg marking is now a hard gate, and a
 *            repair plan fixes the dishes already wrong.
 *   AC7      Photos no dish or banner uses any more are found safely, so they
 *            can be removed after the owner reviews the list.
 *   AC8      Thumbnails cut at 360 px before the 148 px list photo can be
 *            upgraded to 450 px without touching an original.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildImageIndex, imageDiet, matchImage, type ImageIndex } from '@/lib/menu/conceptMatcher';
import libraryDiet from '../fixtures/defaultImageLibraryDiet.json';

const WEB = resolve(__dirname, '../..');
const read = (p: string) => (existsSync(join(WEB, p)) ? readFileSync(join(WEB, p), 'utf8') : '');

// ── Mocks for the route tests (AC2, AC5) ─────────────────────────────────────

vi.mock('server-only', () => ({}));

const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock('@/lib/platform/db/supabase-server', () => ({
    supabaseServer: {
        from: (...a: unknown[]) => mockFrom(...a),
        rpc: (...a: unknown[]) => mockRpc(...a),
    },
}));

const mockVerify = vi.fn();
vi.mock('@/lib/auth/verifyFirebaseToken', () => ({
    verifyFirebaseToken: (...a: unknown[]) => mockVerify(...a),
}));

const LIB_BASE = 'https://x.supabase.co/storage/v1/object/public/default-images/cafe-foods';
const UPLOAD_BASE = 'https://x.supabase.co/storage/v1/object/public/product-images';
const lib = (name: string) => `${LIB_BASE}/${name}.jpeg`;

type Diet = 'v' | 'nv' | 'egg';
const entries = libraryDiet as Array<{ name: string; diet: Diet }>;

function testLibrary() {
    const index = buildImageIndex(entries);
    const byName = new Map(entries.map((e) => [e.name, { imageUrl: lib(e.name), name: e.name, description: '', diet: e.diet }]));
    return { index, byName };
}

vi.mock('@/lib/menu/imageLibrary', () => ({
    getImageLibrary: async () => testLibrary(),
    imageNameFromUrl: (url: string) => (url.split('/').pop() ?? '').replace(/\.(jpeg|jpg|png|webp|avif)$/i, ''),
}));

import { NextRequest } from 'next/server';

/** Chainable query-builder stand-in, after tests/api/routes.test.ts. */
function qb(result: { data?: unknown; error?: unknown } = {}) {
    const settled = { data: result.data ?? null, error: result.error ?? null };
    const chain: Record<string, unknown> = {
        single: vi.fn().mockResolvedValue(settled),
        maybeSingle: vi.fn().mockResolvedValue(settled),
        then: (f: (v: typeof settled) => unknown) => Promise.resolve(settled).then(f),
    };
    for (const m of ['select', 'eq', 'gte', 'order', 'limit', 'range']) chain[m] = vi.fn(() => chain);
    return chain as never;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockResolvedValue('user-1');
});

// Real names from the live database, each marked veg by its owner and each
// showing a meat or egg photo today.
const VEG_MARKED_WRONG_TODAY = [
    'Kadala Curry', 'Kathirikai Curry', 'Vatha Kuzhambu', 'Poriyal', 'Tender Coconut',
    'Hakka Noodles', 'Veg. Chowmein', 'Hot And Sour Soup', 'Tomato Soup', 'Sweet Corn Soup',
    'Paneer Malai Tikka', 'Tandoori Gobi', 'Veg Fried Rice', 'Onion Uthappam', 'English Breakfast',
    'Dal tadka', 'Dal Fry', 'Nachos with Cheese', 'Haryali Tikka Roll', 'Cheese Seekh Kebab',
    'Mushroom and Swiss Burger', 'Afghan Dry Fruit', 'Curry Masala Fries',
    'Spinach Corn & Cheese Wontons [5 Pieces]', 'Fried Rice - Paneer / Mushroom',
];

// ─────────────────────────────────────────────────────────────────────────────
// AC1–AC2 — Total Visitors is counted by the database
// ─────────────────────────────────────────────────────────────────────────────

describe('AC1: migration 066 counts distinct visitors in the database', () => {
    const file = readdirSync(join(WEB, 'supabase/migrations')).find((f) => f.startsWith('066_'));
    const sql = file ? readFileSync(join(WEB, 'supabase/migrations', file), 'utf8') : '';

    it('exists', () => {
        expect(file, 'supabase/migrations/066_*.sql').toBeDefined();
    });

    it('defines menu_scan_counts(site, since) with count(distinct visitor_id)', () => {
        expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.menu_scan_counts\(\s*p_site_id uuid,\s*p_since timestamptz\s*\)/i);
        expect(sql).toMatch(/count\(DISTINCT visitor_id\)/i);
        expect(sql).toMatch(/FILTER \(WHERE scanned_at >= p_since\)/i);
    });

    it('is a stable function with a pinned search_path (no mutable-search_path advisory)', () => {
        expect(sql).toMatch(/\bSTABLE\b/i);
        expect(sql).toMatch(/SET search_path = ''/i);
    });

    it('is callable by the server only — never with the public key', () => {
        expect(sql).toMatch(/REVOKE (ALL|EXECUTE) ON FUNCTION public\.menu_scan_counts\(uuid, timestamptz\)\s+FROM PUBLIC, anon, authenticated/i);
        expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.menu_scan_counts\(uuid, timestamptz\)\s+TO service_role/i);
    });

    it('is expand-only: no table is dropped, altered or emptied', () => {
        expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
        expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
        expect(sql).not.toMatch(/\b(DELETE\s+FROM|TRUNCATE)\b/i);
    });
});

describe('AC2: the dashboard summary asks the database for the counts', () => {
    const SITE = '11111111-1111-4111-8111-111111111111';
    const req = () => new NextRequest(`http://localhost/api/manage/menu-summary?site_id=${SITE}`, {
        headers: { authorization: 'Bearer t' },
    });
    const tablesTouched = () => mockFrom.mock.calls.map((c) => c[0]);

    function tables(scanRows: Array<{ visitor_id: string }> = []) {
        mockFrom.mockImplementation((t: string) => {
            if (t === 'sites') return qb({ data: { id: SITE, timezone: 'Asia/Kolkata' } });
            if (t === 'products') return qb({ data: [{ category: 'Tiffin' }, { category: 'Tiffin' }] });
            if (t === 'menu_scans') return qb({ data: scanRows });
            return qb();
        });
    }

    it('returns the counts from menu_scan_counts and reads no scan rows', async () => {
        tables();
        mockRpc.mockResolvedValue({ data: [{ today: 3, total: 1500 }], error: null });
        const { GET } = await import('@/app/api/manage/menu-summary/route');
        const res = await GET(req());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.scans_today).toBe(3);
        expect(body.scans_total).toBe(1500);
        expect(tablesTouched()).not.toContain('menu_scans');
        expect(mockRpc).toHaveBeenCalledTimes(1);
        const [fn, args] = mockRpc.mock.calls[0];
        expect(fn).toBe('menu_scan_counts');
        expect(args.p_site_id).toBe(SITE);
        expect(Date.parse(args.p_since)).not.toBeNaN();
    });

    it('accepts the single-object form PostgREST may return', async () => {
        tables();
        mockRpc.mockResolvedValue({ data: { today: 0, total: 7 }, error: null });
        const { GET } = await import('@/app/api/manage/menu-summary/route');
        const body = await (await GET(req())).json();
        expect(body.scans_total).toBe(7);
    });

    it('keeps working before 066 is applied: falls back to counting rows', async () => {
        tables([{ visitor_id: 'a' }, { visitor_id: 'a' }, { visitor_id: 'b' }]);
        mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
        const { GET } = await import('@/app/api/manage/menu-summary/route');
        const res = await GET(req());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.scans_total).toBe(2);
        expect(tablesTouched()).toContain('menu_scans');
    });

    it('keeps the rest of the response unchanged', async () => {
        tables();
        mockRpc.mockResolvedValue({ data: [{ today: 1, total: 2 }], error: null });
        const { GET } = await import('@/app/api/manage/menu-summary/route');
        const body = await (await GET(req())).json();
        expect(body.total_products).toBe(2);
        expect(body).toHaveProperty('total_categories');
        expect(body).toHaveProperty('categories');
        expect(body).toHaveProperty('generated_at');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC3–AC6 — a dish never shows more meat than it has
// ─────────────────────────────────────────────────────────────────────────────

let index: ImageIndex;
beforeAll(() => { index = buildImageIndex(entries); });

const dietOf = (imageName: string) => imageDiet(imageName, index);

describe('AC3: the matcher takes the dish\'s own veg / egg / non-veg marking as a hard gate', () => {
    it('a dish marked veg never gets a non-veg or egg photo — the live failures', () => {
        for (const name of VEG_MARKED_WRONG_TODAY) {
            const r = matchImage(name, index, { diet: 'v' });
            if (r.image) expect(dietOf(r.image), `${name} → ${r.image}`).toBe('v');
        }
    });

    it('holds across the whole library used as queries', () => {
        for (const { name } of entries) {
            const query = name.replace(/-v\d+[a-z]?$/, '').replace(/-/g, ' ');
            const veg = matchImage(query, index, { diet: 'v' });
            if (veg.image) expect(dietOf(veg.image), `veg "${query}" → ${veg.image}`).toBe('v');
            const egg = matchImage(query, index, { diet: 'egg' });
            if (egg.image) expect(dietOf(egg.image), `egg "${query}" → ${egg.image}`).not.toBe('nv');
        }
    });

    it('Kadala Curry, marked veg, no longer gets the chicken curry', () => {
        expect(matchImage('Kadala Curry', index).image).toBe('dhaba-style-chicken-curry');
        expect(matchImage('Kadala Curry', index, { diet: 'v' }).image).not.toBe('dhaba-style-chicken-curry');
    });

    it('loses no correct photo: veg, egg and non-veg dishes still find theirs', () => {
        expect(matchImage('Veg Fried Rice', index, { diet: 'v' }).image).toBe('veg-fried-rice-v5');
        expect(matchImage('Egg Fried Rice', index, { diet: 'egg' }).image).toMatch(/^egg-fried-rice/);
        expect(matchImage('Chicken Biryani', index, { diet: 'nv' }).image).toMatch(/^chicken-biryani/);
        expect(matchImage('Paneer Butter Masala', index, { diet: 'v' }).image).toMatch(/^paneer-butter-masala/);
    });

    it('without a marking, behaves exactly as before', () => {
        for (const q of ['Dal Fry', 'Chicken 65', 'Masala Dosa', 'Kadala Curry', 'Noodles']) {
            expect(matchImage(q, index, {})).toEqual(matchImage(q, index));
        }
    });
});

describe('AC4: one helper turns a dish into a library photo URL, with its marking', () => {
    it('maps the stored food_type / dish_type to a diet', async () => {
        const { dietFromFoodType } = await import('@/lib/menu/libraryPhoto');
        expect(dietFromFoodType('veg')).toBe('v');
        expect(dietFromFoodType('egg')).toBe('egg');
        expect(dietFromFoodType('non_veg')).toBe('nv');
        expect(dietFromFoodType('unknown')).toBeNull();
        expect(dietFromFoodType(null)).toBeNull();
        expect(dietFromFoodType(undefined, 'Vegetarian')).toBe('v');
        expect(dietFromFoodType(undefined, 'Egg')).toBe('egg');
        // food_type wins: dish_type defaulted to Non-Vegetarian for years.
        expect(dietFromFoodType('veg', 'Non-Vegetarian')).toBe('v');
    });

    it('returns the URL of a photo that respects the marking, or null', async () => {
        const { pickLibraryImage } = await import('@/lib/menu/libraryPhoto');
        const library = testLibrary();
        expect(pickLibraryImage('Veg Fried Rice', 'veg', library)).toBe(lib('veg-fried-rice-v5'));
        expect(pickLibraryImage('Kadala Curry', 'non_veg', library)).toBe(lib('dhaba-style-chicken-curry'));
        const veg = pickLibraryImage('Kadala Curry', 'veg', library);
        if (veg) expect(dietOf(veg.split('/').pop()!.replace('.jpeg', ''))).toBe('v');
        expect(pickLibraryImage('', 'veg', library)).toBeNull();
    });
});

describe('AC5: every place that picks a library photo passes the dish\'s marking', () => {
    it('bulk upload uses the concept matcher — no embedding call, no vector RPC', () => {
        const src = read('src/app/api/bulk-import/insert/route.ts');
        expect(src).not.toMatch(/embeddings\.create/);
        expect(src).not.toMatch(/match_default_image/);
        expect(src).toMatch(/pickLibraryImage\(/);
        expect(src).toMatch(/food_type/);
    });

    it('onboarding passes each item\'s food_type', () => {
        const src = read('src/app/api/onboarding/complete/route.ts');
        expect(src).toMatch(/pickLibraryImage\(/);
        expect(src).toMatch(/findImagesForItems\(items\.map\(i => \(\{ name: i\.name, foodType: i\.food_type \}\)\)\)/);
    });

    it('POST /api/images/match honours food_type', async () => {
        const { POST } = await import('@/app/api/images/match/route');
        const call = async (body: unknown) => {
            const r = new NextRequest('http://localhost/api/images/match', {
                method: 'POST',
                headers: { 'content-type': 'application/json', cookie: 'sb-access-token=t' },
                body: JSON.stringify(body),
            });
            return (await POST(r)).json() as Promise<{ image_url: string | null }>;
        };
        expect((await call({ query: 'Kadala Curry' })).image_url).toBe(lib('dhaba-style-chicken-curry'));
        const veg = await call({ query: 'Kadala Curry', food_type: 'veg' });
        expect(veg.image_url).not.toBe(lib('dhaba-style-chicken-curry'));
        expect((await call({ query: 'Veg Fried Rice', food_type: 'veg' })).image_url).toBe(lib('veg-fried-rice-v5'));
    });

    it('the dish drawer sends the chosen dish type with its photo search', async () => {
        const { fetchLibraryPhoto } = await import('@/lib/menu/photoSuggest');
        let sent: unknown = null;
        const fetchImpl = (async (_u: string, init?: RequestInit) => {
            sent = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({ image_url: null }), { status: 200 });
        }) as typeof fetch;
        await fetchLibraryPhoto('Kadala Curry', { fetchImpl, foodType: 'veg' });
        expect(sent).toEqual({ query: 'Kadala Curry', food_type: 'veg' });

        const hook = read('src/hooks/usePhotoSuggestion.ts');
        expect(hook).toMatch(/foodType/);
        const page = read('src/app/manage/product-inventory/page.tsx');
        expect(page).toMatch(/food_type: DISH_TYPE_TO_DB\[form\.dishType\]/);
    });
});

describe('AC6: a repair plan fixes the dishes already showing the wrong photo', () => {
    type Row = { id: string; site_id: string; name: string; food_type: string | null; dish_type: string | null; image_url: string | null };
    const row = (id: string, name: string, food_type: string | null, image_url: string | null, dish_type: string | null = null): Row =>
        ({ id, site_id: 's1', name, food_type, dish_type, image_url });

    const PRODUCTS: Row[] = [
        row('p1', 'Kadala Curry', 'veg', lib('dhaba-style-chicken-curry'), 'Vegetarian'),
        row('p2', 'Veg Fried Rice', 'veg', lib('chicken-rice')),
        row('p3', 'Chicken Biryani', 'non_veg', lib('chicken-biryani-v5')),
        row('p4', 'Paneer Tikka', 'non_veg', lib('chicken-tikka'), 'Non-Vegetarian'),
        row('p5', 'Dal Fry', 'veg', `${UPLOAD_BASE}/s1/1727000000000.webp`),
        row('p6', 'English Breakfast', 'veg', lib('bread-omelette')),
        row('p7', 'Gobi 65', 'veg', lib('dragon-gobi')),
        row('p8', 'Idli', 'veg', null),
        row('p9', 'Egg Fried Rice', 'egg', lib('chicken-fried-rice-v5')),
        row('p10', 'Chicken Curry', 'non_veg', lib('home-style-chicken-curry')),
    ];

    it('changes only dishes whose photo shows more meat than the dish has', async () => {
        const { planLibraryPhotoRepair } = await import('@/lib/menu/libraryPhoto');
        const plan = planLibraryPhotoRepair(PRODUCTS, testLibrary());
        expect(plan.map((c) => c.id).sort()).toEqual(['p1', 'p2', 'p4', 'p6', 'p9']);
    });

    it('never touches an owner\'s own upload, a dish with no photo, or a photo that is merely different', async () => {
        const { planLibraryPhotoRepair } = await import('@/lib/menu/libraryPhoto');
        const ids = planLibraryPhotoRepair(PRODUCTS, testLibrary()).map((c) => c.id);
        for (const keep of ['p3', 'p5', 'p7', 'p8', 'p10']) expect(ids).not.toContain(keep);
    });

    it('replaces with a photo that respects both the marking and the name, or with none', async () => {
        const { planLibraryPhotoRepair } = await import('@/lib/menu/libraryPhoto');
        for (const c of planLibraryPhotoRepair(PRODUCTS, testLibrary())) {
            expect(c.from).toBe(PRODUCTS.find((p) => p.id === c.id)!.image_url);
            expect(c.reason).toMatch(/\S/);
            if (c.to === null) continue;
            const name = c.to.split('/').pop()!.replace('.jpeg', '');
            const product = PRODUCTS.find((p) => p.id === c.id)!;
            if (product.food_type === 'veg') expect(dietOf(name)).toBe('v');
            if (product.food_type === 'egg') expect(dietOf(name)).not.toBe('nv');
            if (product.name.includes('Paneer')) expect(dietOf(name)).toBe('v');
        }
        const p2 = planLibraryPhotoRepair(PRODUCTS, testLibrary()).find((c) => c.id === 'p2');
        expect(p2?.to).toBe(lib('veg-fried-rice-v5'));
    });

    it('ships as a dry-run-first script that only rewrites a photo nobody has changed since', () => {
        const src = read('scripts/repair-library-photos.ts');
        expect(src).toMatch(/--apply/);
        expect(src).toMatch(/planLibraryPhotoRepair\(/);
        // Optimistic guard: the update matches the photo the plan was made from.
        expect(src).toMatch(/\.eq\('image_url', change\.from\)/);
        expect(src).toMatch(/\.update\(\{ image_url: change\.to \}\)/);
        expect(src).not.toMatch(/\.delete\(/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC7 — unused photos are found safely
// ─────────────────────────────────────────────────────────────────────────────

describe('AC7: unused owner photos are found without risking one that is in use', () => {
    const NOW = new Date('2026-10-09T00:00:00Z');
    const OLD = '2026-08-01T00:00:00Z';
    const NEW = '2026-10-07T00:00:00Z';
    const OBJECTS = [
        { name: 's1/1.webp', createdAt: OLD },
        { name: 's1/1.thumb.jpg', createdAt: OLD },
        { name: 's1/2.webp', createdAt: OLD },
        { name: 's1/2.thumb.jpg', createdAt: OLD },
        { name: 's1/3.webp', createdAt: NEW },
        { name: 'temp/x.png', createdAt: OLD },
        { name: 's1/4.thumb.jpg', createdAt: OLD },
        { name: 'shop/banner one.jpg', createdAt: OLD },
        { name: 's1/5.webp', createdAt: OLD },
    ];
    const REFS = [
        `${UPLOAD_BASE}/s1/1.webp`,
        `${UPLOAD_BASE}/shop/banner%20one.jpg?v=2`,
        JSON.stringify({ variants: [{ image: `${UPLOAD_BASE}/s1/5.webp` }] }),
    ];

    it('lists unreferenced photos older than the grace period, with their thumbnails', async () => {
        const { findUnusedPhotos } = await import('@/lib/menu/unusedPhotos');
        expect(findUnusedPhotos({ objects: OBJECTS, references: REFS, now: NOW }))
            .toEqual(['s1/2.thumb.jpg', 's1/2.webp', 's1/4.thumb.jpg', 'temp/x.png']);
    });

    it('keeps photos used in a dish, a banner (URL-encoded) or inside dish metadata', async () => {
        const { findUnusedPhotos } = await import('@/lib/menu/unusedPhotos');
        const out = findUnusedPhotos({ objects: OBJECTS, references: REFS, now: NOW });
        for (const keep of ['s1/1.webp', 's1/1.thumb.jpg', 'shop/banner one.jpg', 's1/5.webp']) expect(out).not.toContain(keep);
    });

    it('keeps a fresh upload whose save may still be in flight', async () => {
        const { findUnusedPhotos } = await import('@/lib/menu/unusedPhotos');
        expect(findUnusedPhotos({ objects: OBJECTS, references: REFS, now: NOW })).not.toContain('s1/3.webp');
    });

    it('refuses to decide with no references at all — a failed read must not look like "nothing is used"', async () => {
        const { findUnusedPhotos } = await import('@/lib/menu/unusedPhotos');
        expect(() => findUnusedPhotos({ objects: OBJECTS, references: [], now: NOW })).toThrow(/reference/i);
    });

    it('ships as a script that deletes only a reviewed list, re-checked at delete time, never the food library', () => {
        const src = read('scripts/sweep-unused-photos.ts');
        expect(src).toMatch(/--apply/);
        expect(src).toMatch(/findUnusedPhotos\(/);
        expect(src).toMatch(/manifest/i);
        expect(src).toMatch(/const BUCKET = 'product-images'/);
        expect(src).not.toMatch(/from\('default-images'\)\.remove/);
        expect(src).not.toMatch(/storage\.from\(\s*['"]default-images['"]\s*\)\s*\.remove/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC8 — 360 px thumbnails upgrade to 450 px
// ─────────────────────────────────────────────────────────────────────────────

describe('AC8: old thumbnails are recut at 450 px, originals untouched', () => {
    const SCRIPT = join(WEB, 'scripts', 'upgrade-menu-thumbs.mjs');
    const code = () => (existsSync(SCRIPT) ? readFileSync(SCRIPT, 'utf8') : '');

    it('recuts only a thumbnail smaller than both 450 px and its original', async () => {
        expect(existsSync(SCRIPT)).toBe(true);
        const { needsUpgrade } = await import(pathToFileURL(SCRIPT).href);
        expect(needsUpgrade(360, 1200)).toBe(true);
        expect(needsUpgrade(300, 400)).toBe(true);
        expect(needsUpgrade(450, 1200)).toBe(false);
        expect(needsUpgrade(360, 360)).toBe(false);
        expect(needsUpgrade(400, 380)).toBe(false);
    });

    it('cuts the same size and quality as the app', async () => {
        const { THUMB_EDGE_PX, THUMB_QUALITY } = await import('@/lib/menu/menuImages');
        expect(code()).toMatch(new RegExp(`const THUMB_EDGE_PX = ${THUMB_EDGE_PX};`));
        expect(code()).toMatch(new RegExp(`const THUMB_QUALITY = ${THUMB_QUALITY};`));
    });

    it('is a dry run by default, never deletes, and can only write a .thumb.jpg', () => {
        expect(code()).toMatch(/--apply/);
        expect(code()).not.toMatch(/\.remove\(/);
        expect(code()).toMatch(/if \(!target\.endsWith\(THUMB_SUFFIX\)\) throw/);
    });

    it('leaves the add-only backfill exactly as locked', () => {
        const backfill = read('scripts/backfill-menu-thumbs.mjs');
        expect(backfill).not.toMatch(/upsert:\s*true/);
    });
});
