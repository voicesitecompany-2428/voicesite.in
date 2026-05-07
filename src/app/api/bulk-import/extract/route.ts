// src/app/api/bulk-import/extract/route.ts
// Extracts menu items from photos — works with printed menus AND food/dish photos.

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { validateImageFile } from '@/lib/fileValidation';
import { rateLimit } from '@/lib/rateLimit';
import OpenAI from 'openai';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_PHOTOS = 3;
const EXTRACT_LIMIT_PER_HR = 20;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Pass 1: structured extraction (menu text or visible dish names)
const STRICT_PROMPT = `You are a food menu assistant for an Indian restaurant. Look at the photo(s) carefully.

List every food item or beverage you can see OR read in the photo(s). This includes:
- Text on a printed/digital menu (read all item names and prices)
- Food dishes visible in the photo (identify each dish by its common name)

Return ONLY this JSON (no other text):
{
  "items": [
    { "name": "Chicken Fry", "price": 160, "category": "Starters", "item_type": "variant", "food_type": "non_veg", "description": "", "variants": [{"size": "Half", "price": 160}, {"size": "Full", "price": 320}] },
    { "name": "Dosa", "price": 60, "category": "Breakfast", "item_type": "single", "food_type": "veg", "description": "", "variants": [] }
  ]
}

FIELD RULES:
- name: English name. Transliterate if in another language.
- price: number in INR. For variant items use the lowest variant price. Use 0 if not visible.
- category: section heading from menu, or infer (e.g. "Starters", "Rice", "Beverages"). Use "" if unknown.
- item_type:
    "single"  = one price, one size (default)
    "variant" = same dish in multiple sizes/portions with DIFFERENT prices (Half/Full, Small/Large, 250ml/500ml)
    "combo"   = bundled meal deal (Meal 1, Family Pack)
- food_type: "veg", "non_veg", "egg", or "unknown". Infer from dish name if not marked (Chicken → non_veg, Paneer → veg).
- description: always "".
- variants: REQUIRED for "variant" items — array of {"size": "...", "price": number}. Empty [] for all other types.

RULES:
- For food photos: identify every dish visible. One item per distinct dish.
- For menu photos: extract EVERY item — do not skip any. Read prices carefully.
- Do NOT include: phone numbers, addresses, taglines, table numbers, GST notes.
- Remove exact duplicates.
- If nothing identifiable is found, return { "items": [] }.`;

// Fallback Pass: very direct — just name what you see
const FALLBACK_PROMPT = `Look at this photo of a restaurant menu or food. List every food or drink item you can identify.

Return ONLY this JSON:
{
  "items": [
    { "name": "dish name", "price": 0, "category": "", "item_type": "single", "food_type": "unknown", "description": "", "variants": [] }
  ]
}

For items that come in multiple sizes with different prices (like Half/Full), use item_type "variant" and fill the variants array:
  { "name": "Chicken", "price": 120, "item_type": "variant", "food_type": "non_veg", "description": "", "category": "", "variants": [{"size":"Half","price":120},{"size":"Full","price":240}] }

Include every dish visible. Be inclusive — even partial dish names are fine.`;

async function callGPT4o(
  openai: OpenAI,
  imageContent: Array<{ type: 'image_url'; image_url: { url: string; detail: 'high' } }>,
  systemPrompt: string,
  label: string
): Promise<unknown[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: 'Extract all food items. Return JSON.' },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  console.log(`[bulk-import/extract] ${label} raw response (first 500 chars): ${raw.slice(0, 500)}`);

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw) as Record<string, unknown>; }
  catch { console.warn(`[bulk-import/extract] ${label} JSON parse failed`); return []; }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  console.log(`[bulk-import/extract] ${label} extracted ${items.length} items`);
  return items;
}

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

    console.log(`[bulk-import/extract] received ${photoEntries.length} entries`);

    // Validate images
    const validated: Array<{ file: File; mime: string }> = [];
    for (const entry of photoEntries) {
      if (!(entry instanceof File)) { console.warn('[bulk-import/extract] entry is not a File, skipping'); continue; }
      console.log(`[bulk-import/extract] validating file: name=${entry.name} size=${entry.size} type=${entry.type}`);
      const result = await validateImageFile(entry);
      if (result.ok) {
        validated.push({ file: entry, mime: result.mime });
        console.log(`[bulk-import/extract] validated: ${entry.name} → ${result.mime}`);
      } else {
        console.warn(`[bulk-import/extract] rejected ${entry.name}: ${result.reason}`);
      }
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

    console.log(`[bulk-import/extract] ${imageBuffers.length} image buffers ready, total size: ${imageBuffers.reduce((s, b) => s + b.buffer.length, 0)} bytes`);

    const openai = getOpenAI();
    const imageContent = imageBuffers.map(({ buffer, mime }) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:${mime};base64,${buffer.toString('base64')}`,
        detail: 'high' as const,
      },
    }));

    // Pass 1: structured extraction
    let items: unknown[] = [];
    try {
      items = await callGPT4o(openai, imageContent, STRICT_PROMPT, 'Pass1');
    } catch (err) {
      console.error('[bulk-import/extract] Pass1 failed:', err);
    }

    // Fallback: simpler direct prompt
    if (items.length === 0) {
      console.warn('[bulk-import/extract] Pass1 returned 0 items — trying fallback prompt');
      try {
        items = await callGPT4o(openai, imageContent, FALLBACK_PROMPT, 'Fallback');
      } catch (err) {
        console.error('[bulk-import/extract] Fallback failed:', err);
        return NextResponse.json({ error: 'AI extraction failed. Please retry.' }, { status: 502 });
      }
    }

    console.log(`[bulk-import/extract] final: ${items.length} items in ${Date.now() - t0}ms`);

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: 'We couldn\'t identify any food items from those photos. Please upload a clearer photo of your dishes or a printed menu.',
          hint: 'Tips: use good lighting, keep the dish/menu in frame, avoid blurry shots.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, items, photosProcessed: imageBuffers.length });
  } catch (err) {
    console.error('[bulk-import/extract] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
