// src/app/api/onboarding/complete/route.ts
// Step 2 of split onboarding: receives JSON (shopName + extracted items with
// owner-assigned tiers), creates site + bulk-inserts products with all fields.
// No OCR or GPT calls here — those happened in /api/onboarding/extract.

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { supabaseServer } from '@/lib/supabase-server';
import { matchByKeyword } from '@/lib/defaultImages';
import { rateLimit } from '@/lib/rateLimit';
import { weightedScore, previewQuadrant } from '@/lib/menuEngineering';
import OpenAI from 'openai';

// ── Types ────────────────────────────────────────────────────────────────────

interface EnrichedItem {
  name: string;
  price: number;
  description: string;
  category: string | null;
  item_type: 'single' | 'variant' | 'combo';
  food_type: 'veg' | 'non_veg' | 'egg' | 'unknown';
  variants?: Array<{ size: string; price: number }>;
  // Menu engineering tiers — collected by wizard
  star_rating: number;         // 1–4
  profit_tier: number;         // 1–4
  prep_complexity_tier: number; // 1–4
}

interface CompletePayload {
  shopName: string;
  items: EnrichedItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw lastErr;
}

async function findDefaultImage(productName: string): Promise<string | null> {
  const kwMatch = matchByKeyword(productName);
  if (kwMatch) return kwMatch.image_url;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: productName.slice(0, 500).toLowerCase(),
    });
    const queryVector = embRes.data[0].embedding;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseServer as any).rpc('match_default_image', {
      query_embedding: queryVector,
      match_threshold: 0.45,
      match_count: 1,
    });
    if (!error && data?.length) return data[0].image_url as string;
  } catch (e) {
    console.warn(`[onboarding/complete] image match failed for "${productName}":`, e);
  }
  return null;
}

function generateSlug(name: string): string {
  return (
    name.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) || `cafe-${Date.now()}`
  );
}

function clampTier(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = await verifyFirebaseToken(authHeader.replace('Bearer ', ''));
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const rl = rateLimit(`onboarding:${userId}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many onboarding attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      );
    }

    // ── Parse JSON body ───────────────────────────────────────────────────────
    let payload: CompletePayload;
    try {
      payload = await request.json() as CompletePayload;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { shopName, items = [] } = payload;
    if (!shopName?.trim()) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 });
    }

    // Validate tier values — reject anything clearly out of range
    for (const item of items) {
      if (item.star_rating < 1 || item.star_rating > 4 ||
          item.profit_tier < 1 || item.profit_tier > 4 ||
          item.prep_complexity_tier < 1 || item.prep_complexity_tier > 4) {
        return NextResponse.json({ error: 'Invalid tier value — must be 1–4' }, { status: 400 });
      }
    }

    // ── Unique slug ───────────────────────────────────────────────────────────
    const baseSlug = generateSlug(shopName.trim());
    let slug = baseSlug;
    let counter = 1;
    await withRetry(async () => {
      slug = baseSlug; counter = 1;
      while (true) {
        const { data: existing } = await supabaseServer.from('sites').select('slug').eq('slug', slug).single();
        if (!existing) break;
        slug = `${baseSlug}-${counter++}`;
      }
    });

    // ── Insert site ───────────────────────────────────────────────────────────
    let site: { id: string; slug: string } | null = null;
    await withRetry(async () => {
      const { data, error: siteError } = await supabaseServer
        .from('sites')
        .insert({
          user_id: userId,
          slug,
          type: 'Menu',
          name: shopName.trim(),
          category: 'cafe',
          description: `${shopName.trim()} digital menu`,
        })
        .select('id, slug')
        .single();
      if (siteError || !data) throw new Error(siteError?.message ?? 'site insert returned no data');
      site = data as { id: string; slug: string };
    });

    if (!site) {
      return NextResponse.json({ error: 'Failed to create site after retries' }, { status: 500 });
    }
    const siteRecord = site as { id: string; slug: string };

    // ── Pre-select site for new session ──────────────────────────────────────
    // (localStorage key is set client-side after redirect)

    // ── Bulk insert products ──────────────────────────────────────────────────
    let insertedCount = 0;
    if (items.length > 0) {
      const imageUrls = await Promise.all(
        items.map(item => findDefaultImage(item.name).catch(() => null))
      );

      // Score every item with the MCDS weighted formula.
      // At onboarding time ordersToday/likeCount are 0 — score is driven
      // purely by the owner-assigned star_rating (×0.50) and profit_tier (×0.35).
      const scored = items.map((item, i) => ({
        item,
        imageUrl: imageUrls[i] ?? null,
        score: weightedScore({
          starRating:  clampTier(item.star_rating),
          profitTier:  clampTier(item.profit_tier),
          ordersToday: 0,
          likeCount:   0,
          offerActive: false,
        }),
      }));

      // Sort highest score first — this becomes the customer-facing menu order.
      scored.sort((a, b) => b.score - a.score);

      const rows = scored.map(({ item, imageUrl }, displayOrder) => ({
        site_id: siteRecord.id,
        name: item.name,
        selling_price: item.price,
        description: item.description,
        category: item.category ?? null,
        item_type: item.item_type,
        food_type: item.food_type,
        type:      item.item_type === 'variant' ? 'Variants' : item.item_type === 'combo' ? 'Combo' : 'Single Item',
        dish_type: item.food_type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian',
        image_url: imageUrl,
        metadata: item.variants?.length ? { variants: item.variants } : null,
        star_rating:          clampTier(item.star_rating),
        profit_tier:          clampTier(item.profit_tier),
        prep_complexity_tier: clampTier(item.prep_complexity_tier),
        display_order:        displayOrder,
        ks_quadrant:          previewQuadrant(clampTier(item.star_rating), clampTier(item.profit_tier)),
      }));

      try {
        const { error: prodError } = await withRetry(async () =>
          supabaseServer.from('products').insert(rows)
        );
        if (prodError) {
          console.error('[onboarding/complete] products insert error:', prodError);
        } else {
          insertedCount = rows.length;
          console.log(`[onboarding/complete] inserted ${insertedCount} products for site ${siteRecord.id}`);
        }
      } catch (retryErr) {
        console.error('[onboarding/complete] products insert failed after 3 retries:', retryErr);
      }
    }

    // ── Mark onboarding complete ──────────────────────────────────────────────
    try {
      await withRetry(async () =>
        supabaseServer
          .from('profiles')
          .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
          .eq('id', userId)
      );
    } catch (err) {
      console.error('[onboarding/complete] CRITICAL: failed to mark onboarding complete:', err);
    }

    return NextResponse.json({
      success: true,
      siteId: siteRecord.id,
      siteSlug: siteRecord.slug,
      itemCount: insertedCount,
      extracted: items.length,
    });
  } catch (err) {
    console.error('[onboarding/complete] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
