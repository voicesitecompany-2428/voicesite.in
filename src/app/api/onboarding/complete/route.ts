// src/app/api/onboarding/complete/route.ts
// Handles the full onboarding flow:
//   1. Verify Firebase JWT
//   2. OCR each menu photo with Sarvam Vision (+ GPT-4o fallback)
//   3. Extract structured menu items via GPT-4o-mini
//   4. Create sites record (type: Menu, category: cafe)
//   5. Bulk insert products
//   6. Auto-match default images for each product
//   7. Mark onboarding_completed = true on profiles

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { supabaseServer } from '@/lib/supabase';
import { imageToMenuText } from '@/lib/sarvamVision';
import { extractMenuItems } from '@/lib/menuExtractor';
import { matchByKeyword } from '@/lib/defaultImages';
import OpenAI from 'openai';

/**
 * Retries an async operation up to `attempts` times with exponential backoff.
 * Handles transient network failures (ConnectTimeoutError, fetch failed)
 * that occur after long-running operations like OCR + GPT extraction.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1500
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Finds the best default image URL for a product name.
 * Strategy:
 *   1. Keyword map (O(1), no network) — fast local lookup
 *   2. Vector similarity via Supabase RPC (pgvector) — semantic match
 * Returns null when neither finds a match (product gets no auto-image).
 */
async function findDefaultImage(productName: string): Promise<string | null> {
  // 1. Keyword fallback — instant
  const kwMatch = matchByKeyword(productName);
  if (kwMatch) return kwMatch.image_url;

  // 2. Vector similarity search
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const safeQuery = productName.slice(0, 500).toLowerCase();
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: safeQuery,
    });
    const queryVector = embRes.data[0].embedding;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseServer as any).rpc('match_default_image', {
      query_embedding: queryVector,
      match_threshold: 0.45,
      match_count: 1,
    });

    if (!error && data?.length) {
      console.log(`[onboarding] image match "${productName}" → similarity ${data[0].similarity?.toFixed(3)}`);
      return data[0].image_url as string;
    }
  } catch (e) {
    console.warn(`[onboarding] image match failed for "${productName}":`, e);
  }

  return null;
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) || `cafe-${Date.now()}`
  );
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = await verifyFirebaseToken(authHeader.replace('Bearer ', ''));
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ── 2. Parse form data ───────────────────────────────────
    const formData = await request.formData();
    const shopName = (formData.get('shopName') as string | null)?.trim();
    if (!shopName) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 });
    }

    const photoEntries = formData.getAll('photos');
    const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per photo
    const photoFiles: File[] = photoEntries
      .filter((v): v is File => v instanceof File && v.size > 0 && v.size <= MAX_FILE_BYTES);

    // ── 3. OCR each photo (parallel — reduces wall time from N×10s to ~10s) ──
    const ocrResults = await Promise.all(
      photoFiles.slice(0, 10).map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return imageToMenuText(buffer, file.type || 'image/jpeg');
      })
    );
    const aggregatedOcr = ocrResults.filter(t => t.trim()).join('\n\n---\n\n');
    console.log(`[onboarding/complete] OCR text (first 300 chars): ${aggregatedOcr.slice(0, 300)}`);

    // ── 4. Extract structured menu items ─────────────────────
    const menuItems = aggregatedOcr ? await extractMenuItems(aggregatedOcr) : [];
    console.log(`[onboarding/complete] Extracted ${menuItems.length} items for user ${userId}`);

    // ── 5. Create unique slug (with retry) ───────────────────
    const baseSlug = generateSlug(shopName);
    let slug = baseSlug;
    let counter = 1;
    // Find a unique slug — retry the whole loop on transient failures
    await withRetry(async () => {
      slug = baseSlug;
      counter = 1;
      while (true) {
        const { data: existing } = await supabaseServer
          .from('sites')
          .select('slug')
          .eq('slug', slug)
          .single();
        if (!existing) break;
        slug = `${baseSlug}-${counter++}`;
      }
    });

    // ── 6. Insert site (with retry) ───────────────────────────
    let site: { id: string; slug: string } | null = null;
    await withRetry(async () => {
      const { data, error: siteError } = await supabaseServer
        .from('sites')
        .insert({
          user_id: userId,
          slug,
          type: 'Menu',
          name: shopName,
          category: 'cafe',
          description: `${shopName} digital menu`,
        })
        .select('id, slug')
        .single();

      if (siteError || !data) {
        console.error('[onboarding/complete] site insert error:', siteError);
        throw new Error(siteError?.message ?? 'site insert returned no data');
      }
      site = data as { id: string; slug: string };
    });

    if (!site) {
      return NextResponse.json({ error: 'Failed to create site after retries' }, { status: 500 });
    }
    const siteRecord = site as { id: string; slug: string };

    // ── 7. Bulk insert products (with retry — TCP connect can timeout after long OCR) ──
    let insertedCount = 0;
    if (menuItems.length > 0) {
      // Auto-match default images in parallel (best-effort, never blocks product insert)
      const imageUrls = await Promise.all(
        menuItems.map(item => findDefaultImage(item.name).catch(() => null))
      );

      const rows = menuItems.map((item, i) => ({
        site_id: siteRecord.id,
        name: item.name,
        selling_price: item.price,
        description: item.description,
        category: item.category || null,
        item_type: item.item_type,
        food_type: item.food_type,
        // UI-facing columns for inventory page
        type:      item.item_type === 'variant' ? 'Variants' : item.item_type === 'combo' ? 'Combo' : 'Single Item',
        dish_type: item.food_type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian',
        // Auto-matched default image (null if no match — user can upload their own)
        image_url: imageUrls[i] ?? null,
        // Store variant sizes+prices in metadata so the template can render them
        metadata: item.variants && item.variants.length > 0
          ? { variants: item.variants }
          : null,
      }));

      try {
        const { error: prodError } = await withRetry(async () =>
          supabaseServer.from('products').insert(rows)
        );

        if (prodError) {
          // Log but don't fail — site is created, user can add items manually
          console.error('[onboarding/complete] products insert error:', prodError);
        } else {
          insertedCount = rows.length;
          console.log(`[onboarding/complete] inserted ${insertedCount} products for site ${siteRecord.id}`);
        }
      } catch (retryErr) {
        // All 3 attempts failed — log clearly, continue to mark onboarding complete
        console.error('[onboarding/complete] products insert failed after 3 retries:', retryErr);
      }
    }

    // ── 8. Mark onboarding complete (with retry) ──────────────
    try {
      await withRetry(async () =>
        supabaseServer
          .from('profiles')
          .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
          .eq('id', userId)
      );
    } catch (err) {
      // Critical — log loudly but don't block the response
      console.error('[onboarding/complete] CRITICAL: failed to mark onboarding complete:', err);
    }

    return NextResponse.json({
      success: true,
      siteSlug: siteRecord.slug,
      itemCount: insertedCount,
      extracted: menuItems.length,
    });
  } catch (err) {
    console.error('[onboarding/complete] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
