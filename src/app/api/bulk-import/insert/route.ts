// src/app/api/bulk-import/insert/route.ts
// Receives extracted menu items from the client (already parsed by /api/onboarding/extract)
// and inserts them into an existing site with image matching + menu engineering.
//
// Quota: 10 photos per user per calendar month, tracked in bulk_import_usage table.
// Each call declares photosCount (1–3) consumed by the preceding /extract call.

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { supabaseServer } from '@/lib/supabase-server';
import { matchByKeyword } from '@/lib/defaultImages';
import { weightedScore, previewQuadrant } from '@/lib/menuEngineering';
import OpenAI from 'openai';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MONTHLY_PHOTO_LIMIT = 10;
const MAX_ITEMS = 300;
const MAX_VARIANTS = 10;
const SIM_THRESHOLD = 0.45;
const RPC_CONCURRENCY = 10;

// ── OpenAI singleton ──────────────────────────────────────────────────────────
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clampTier(v: number): number { return Math.min(4, Math.max(1, Math.round(v))); }

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 1500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw last;
}

async function mapWithLimit<T, R>(
  items: T[], limit: number, fn: (x: T, i: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array(Math.min(limit, items.length)).fill(0).map(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function findImagesForItems(itemNames: string[]): Promise<Array<string | null>> {
  const keywordHits = itemNames.map(name => matchByKeyword(name)?.image_url ?? null);
  const indicesNeedingEmbedding: number[] = [];
  itemNames.forEach((_, i) => { if (!keywordHits[i]) indicesNeedingEmbedding.push(i); });
  if (indicesNeedingEmbedding.length === 0) return keywordHits;

  let embeddings: number[][] = [];
  try {
    const res = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: indicesNeedingEmbedding.map(i => itemNames[i].slice(0, 500).toLowerCase()),
    });
    embeddings = res.data.map(d => d.embedding);
  } catch (err) {
    console.warn('[bulk-import/insert] embedding call failed — skipping vector match:', err);
    return keywordHits;
  }

  const rpcResults = await mapWithLimit(indicesNeedingEmbedding, RPC_CONCURRENCY, async (origIdx, posIdx) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseServer as any).rpc('match_default_image', {
        query_embedding: embeddings[posIdx],
        match_threshold: SIM_THRESHOLD,
        match_count: 1,
      });
      if (!error && data?.length) return { origIdx, url: data[0].image_url as string };
    } catch (err) {
      console.warn(`[bulk-import/insert] RPC failed for "${itemNames[origIdx]}":`, err);
    }
    return { origIdx, url: null };
  });

  for (const { origIdx, url } of rpcResults) keywordHits[origIdx] = url;
  return keywordHits;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    // Auth
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = await verifyFirebaseToken(auth.replace('Bearer ', ''));
    if (!userId)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Parse body
    let body: { siteId: string; items: Record<string, unknown>[]; photosCount: number };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { siteId, photosCount } = body;
    let items: Record<string, unknown>[] = body.items ?? [];

    if (!siteId || typeof siteId !== 'string')
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (typeof photosCount !== 'number' || photosCount < 1 || photosCount > 3)
      return NextResponse.json({ error: 'photosCount must be 1–3' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items to insert' }, { status: 400 });
    if (items.length > MAX_ITEMS)
      return NextResponse.json({ error: `Too many items — max ${MAX_ITEMS}` }, { status: 400 });

    // Verify site belongs to this user
    const { data: siteRow, error: siteErr } = await supabaseServer
      .from('sites').select('id').eq('id', siteId).eq('user_id', userId).single();
    if (siteErr || !siteRow)
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    // Quota check
    const month = currentMonth();
    const { data: usageRow } = await supabaseServer
      .from('bulk_import_usage')
      .select('photos_used')
      .eq('user_id', userId)
      .eq('month', month)
      .single();
    const photosUsed = (usageRow as { photos_used: number } | null)?.photos_used ?? 0;

    if (photosUsed + photosCount > MONTHLY_PHOTO_LIMIT) {
      return NextResponse.json({
        error: `Monthly limit reached. You've used ${photosUsed} of ${MONTHLY_PHOTO_LIMIT} photos this month.`,
        code: 'QUOTA_EXCEEDED',
        photosUsed,
        limit: MONTHLY_PHOTO_LIMIT,
      }, { status: 429 });
    }

    // Generate descriptions for items that have none
    const needsDesc = items.some(i => !String(i.description ?? '').trim());
    if (needsDesc) {
      try {
        const payload = items.map(item => ({
          name: String(item.name ?? ''),
          item_type: String(item.item_type ?? 'single'),
          food_type: String(item.food_type ?? 'unknown'),
          variants: Array.isArray(item.variants) ? item.variants : [],
        }));
        const DESCRIBE_SYSTEM_PROMPT = `You write short descriptions for Indian restaurant menu items.
Return { "descriptions": ["...", ...] } in the same order, same length as input.
Each description: 1–2 sentences. Mention key ingredients, taste, how it is served. No filler phrases like "a delicious dish".`;
        const res = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: DESCRIBE_SYSTEM_PROMPT },
            { role: 'user', content: `Write descriptions for these ${payload.length} items:\n\n${JSON.stringify(payload)}` },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4000,
        });
        const raw = res.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const descs = Array.isArray(parsed.descriptions) ? parsed.descriptions as string[] : [];
        items = items.map((item, idx) => ({
          ...item,
          description: String(item.description ?? '').trim() || String(descs[idx] ?? '').trim(),
        }));
      } catch (err) {
        console.warn('[bulk-import/insert] description generation failed — using keyword fallback:', err);
        items = items.map(item => ({
          ...item,
          description: String(item.description ?? '').trim() ||
            (matchByKeyword(String(item.name ?? ''))?.description ?? `${String(item.name ?? '')} — freshly prepared.`),
        }));
      }
    }

    // Image matching
    const imageUrls = await findImagesForItems(items.map(i => String(i.name ?? '')));

    // Score + sort
    const scored = items.map((item, originalIndex) => ({
      item,
      imageUrl: imageUrls[originalIndex] ?? null,
      originalIndex,
      score: weightedScore({
        starRating:  clampTier(Number(item.star_rating) || 2),
        profitTier:  clampTier(Number(item.profit_tier) || 2),
        ordersToday: 0,
        likeCount:   0,
        offerActive: false,
      }),
    }));
    scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);

    // Base display_order — append after existing products
    const { data: maxOrderRow } = await supabaseServer
      .from('products')
      .select('display_order')
      .eq('site_id', siteId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    const baseOrder = ((maxOrderRow as { display_order: number } | null)?.display_order ?? -1) + 1;

    // Build product rows
    const rows = scored.map(({ item, imageUrl }, idx) => {
      const itemType  = String(item.item_type ?? 'single');
      const foodType  = String(item.food_type ?? 'unknown');
      const starRating = clampTier(Number(item.star_rating) || 2);
      const profitTier = clampTier(Number(item.profit_tier) || 2);
      const prepTier   = clampTier(Number(item.prep_complexity_tier) || 2);
      const variants   = Array.isArray(item.variants) ? item.variants.slice(0, MAX_VARIANTS) : [];
      return {
        site_id:              siteId,
        name:                 String(item.name ?? '').trim(),
        selling_price:        Number(item.price) || 0,
        description:          String(item.description ?? ''),
        category:             item.category ? String(item.category) : null,
        item_type:            itemType,
        food_type:            foodType,
        type:                 itemType === 'variant' ? 'Variants' : itemType === 'combo' ? 'Combo' : 'Single Item',
        dish_type:            foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian',
        image_url:            imageUrl,
        metadata:             variants.length ? { variants } : null,
        star_rating:          starRating,
        profit_tier:          profitTier,
        prep_complexity_tier: prepTier,
        display_order:        baseOrder + idx,
        ks_quadrant:          previewQuadrant(starRating, profitTier),
        is_live:              true,
      };
    });

    // Bulk insert
    let insertErr: unknown = null;
    await withRetry(async () => {
      const result = await supabaseServer.from('products').insert(rows);
      if (result.error) { insertErr = result.error; throw result.error; }
    });
    if (insertErr) {
      console.error('[bulk-import/insert] insert failed:', insertErr);
      return NextResponse.json({ error: 'Failed to save products. Please try again.' }, { status: 500 });
    }

    // Update quota (upsert — safe on concurrent retry)
    await supabaseServer.from('bulk_import_usage').upsert(
      { user_id: userId, month, photos_used: photosUsed + photosCount },
      { onConflict: 'user_id,month' }
    );

    return NextResponse.json({
      success: true,
      inserted: rows.length,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    console.error('[bulk-import/insert] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
