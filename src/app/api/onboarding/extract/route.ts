// src/app/api/onboarding/extract/route.ts
// Step 1 of split onboarding: OCR + GPT extraction only — no DB writes.
// Returns the extracted item list so the wizard can collect owner ratings.
// The final DB writes happen in /api/onboarding/complete after the wizard.

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { imageToMenuText } from '@/lib/sarvamVision';
import { extractMenuItems } from '@/lib/menuExtractor';
import { validateImageFile, MAX_IMAGE_BYTES } from '@/lib/fileValidation';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = await verifyFirebaseToken(authHeader.replace('Bearer ', ''));
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Shared rate-limit bucket with /complete — 5 total per hour per user.
    const rl = rateLimit(`onboarding:${userId}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many onboarding attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      );
    }

    // ── Parse & validate photos ──────────────────────────────────────────────
    const formData = await request.formData();
    const shopName = (formData.get('shopName') as string | null)?.trim();
    if (!shopName) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 });
    }

    void MAX_IMAGE_BYTES;
    const photoEntries = formData.getAll('photos').slice(0, 10);
    const validated: Array<{ file: File; mime: string }> = [];
    for (const entry of photoEntries) {
      if (!(entry instanceof File)) continue;
      const result = await validateImageFile(entry);
      if (!result.ok) {
        console.warn(`[onboarding/extract] rejected upload: ${result.reason}`);
        continue;
      }
      validated.push({ file: entry, mime: result.mime });
    }

    // ── OCR (parallel) ───────────────────────────────────────────────────────
    const ocrResults = await Promise.all(
      validated.map(async ({ file, mime }) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return imageToMenuText(buffer, mime);
      })
    );
    const aggregatedOcr = ocrResults.filter(t => t.trim()).join('\n\n---\n\n');

    // ── Extract structured items ──────────────────────────────────────────────
    const menuItems = aggregatedOcr ? await extractMenuItems(aggregatedOcr) : [];
    console.log(`[onboarding/extract] Extracted ${menuItems.length} items for user ${userId.slice(0, 8)}…`);

    return NextResponse.json({
      success: true,
      shopName,
      items: menuItems,
    });
  } catch (err) {
    console.error('[onboarding/extract] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
