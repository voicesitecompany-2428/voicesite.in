// src/app/api/bulk-import/extract/route.ts
// Extracts menu items from product/dish photos — works with both printed menus
// AND food photos (GPT-4o vision identifies dishes even without visible text).

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { validateImageFile } from '@/lib/fileValidation';
import { rateLimit } from '@/lib/rateLimit';
import OpenAI from 'openai';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_PHOTOS = 3;
const EXTRACT_LIMIT_PER_HR = 20;
const PASS1_MAX_TOKENS = 8000;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Works for both printed menus and food/product photos
const EXTRACT_SYSTEM_PROMPT = `You are a menu extraction assistant for Indian restaurants.

You will receive 1–3 photos. These may be:
  A) A printed/digital menu (text-based: item names, prices, categories visible)
  B) Photos of individual food dishes or products

For BOTH types, extract every distinct food or beverage item visible.

Return ONLY valid JSON:
{ "items": [
  { "name": "Item Name", "price": 0, "category": "Category", "item_type": "single", "food_type": "veg", "description": "" }
]}

FIELD RULES:
- name: string — the dish/item name in English. Transliterate regional names (தோசை → Dosa).
- price: number in INR. If price is visible, use it. If not visible, use 0.
- category: string — section heading if visible, or infer from context (e.g. "Starters", "Rice", "Beverages"). Use "" if truly unknown.
- item_type: "single" | "variant" | "combo"
  • "variant" = same dish in multiple sizes/portions with different prices
  • "combo" = bundled meal deal
  • "single" = everything else
- food_type: "veg" | "non_veg" | "egg" | "unknown"
  • Use veg/non-veg dot colour if visible. Infer from dish name if not (e.g. "Chicken" → non_veg, "Paneer" → veg).
- description: leave as "" — descriptions are generated in a separate step.

RULES:
- For food photos (type B): identify every dish visible. One item per distinct dish.
- For menu photos (type A): extract every item in the menu. Do not skip any.
- Do NOT include: phone numbers, addresses, taglines, table numbers, GST notes.
- Remove exact duplicates.
- If nothing identifiable is found, return { "items": [] }.`;

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

    // Rate limit
    const rl = rateLimit(`bulk-extract:${userId}`, { limit: EXTRACT_LIMIT_PER_HR, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      );
    }

    // Parse form
    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

    const photoEntries = formData.getAll('photos').slice(0, MAX_PHOTOS);
    if (photoEntries.length === 0)
      return NextResponse.json({ error: 'Please upload at least one photo.' }, { status: 400 });

    // Validate images
    const validated: Array<{ file: File; mime: string }> = [];
    for (const entry of photoEntries) {
      if (!(entry instanceof File)) continue;
      const result = await validateImageFile(entry);
      if (result.ok) validated.push({ file: entry, mime: result.mime });
    }
    if (validated.length === 0)
      return NextResponse.json({ error: 'None of your photos could be read. Upload clear JPG, PNG, or WebP photos under 10 MB each.' }, { status: 400 });

    // Read buffers
    const buffersResult = await Promise.allSettled(
      validated.map(async ({ file, mime }) => ({ buffer: Buffer.from(await file.arrayBuffer()), mime }))
    );
    const imageBuffers = buffersResult
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<{ buffer: Buffer; mime: string }>).value);

    if (imageBuffers.length === 0)
      return NextResponse.json({ error: 'Could not read any photos. Please retry.' }, { status: 400 });

    // GPT-4o vision — handles both menu text and food photos
    const openai = getOpenAI();
    const imageContent = imageBuffers.map(({ buffer, mime }) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:${mime};base64,${buffer.toString('base64')}`,
        detail: 'high' as const, // high detail — read menu text AND identify dishes
      },
    }));

    let items: unknown[] = [];
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              ...imageContent,
              { type: 'text', text: 'Extract all food/beverage items from these photos. Return JSON.' },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: PASS1_MAX_TOKENS,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch (err) {
      console.error('[bulk-import/extract] GPT-4o call failed:', err);
      return NextResponse.json({ error: 'AI extraction failed. Please retry.' }, { status: 502 });
    }

    console.log(`[bulk-import/extract] extracted ${items.length} items in ${Date.now() - t0}ms`);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "We couldn't identify any menu items from those photos. Try photos with clearer dish names, or upload a printed menu photo." },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, items, photosProcessed: imageBuffers.length });
  } catch (err) {
    console.error('[bulk-import/extract] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
