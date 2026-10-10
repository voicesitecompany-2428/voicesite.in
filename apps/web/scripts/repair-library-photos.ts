// scripts/repair-library-photos.ts
//
// Fixes dishes that show a library photo with more meat than the dish has —
// a veg dish showing chicken, an egg dish showing mutton. Measured on the live
// DB 2026-10-09: 89 dishes marked veg carried a non-veg library photo. The rule
// and the plan live in src/lib/menu/libraryPhoto.ts; this file only reads,
// reports and (with --apply) writes.
//
// Safe by construction:
//   - DRY RUN unless --apply. The dry run writes the full plan to a JSON file
//     (outside the repo by default — it holds real dish names) and prints a
//     summary. Read it before applying.
//   - Only products.image_url is written, only for dishes in the plan, and only
//     while the dish still shows the exact photo the plan was made from — an
//     owner who changed the photo in the meantime is never overwritten.
//   - Never touches an owner's own upload (product-images): only photos from
//     the shared food library (default-images) are candidates.
//   - Nothing is deleted. A dish with no fitting library photo gets no photo
//     (the owner sees the "add a photo" slot), never a wrong one.
//   - Undo: the plan file lists every { id, from, to }; setting image_url back
//     to `from` restores a row.
//
// Run (from apps/web):
//   node --env-file=.env.local --import ./scripts/lib/register-ts.mjs scripts/repair-library-photos.ts
//   node --env-file=.env.local --import ./scripts/lib/register-ts.mjs scripts/repair-library-photos.ts --apply
// Options: --out <file>  where to write the plan (default: the OS temp folder)

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildImageIndex } from '@/lib/menu/conceptMatcher';
import type { Diet } from '@/lib/menu/conceptVocabulary';
import {
    libraryImageName,
    planLibraryPhotoRepair,
    type PhotoLibrary,
    type RepairableProduct,
} from '@/lib/menu/libraryPhoto';

const APPLY = process.argv.includes('--apply');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), `vsite-photo-repair-${new Date().toISOString().slice(0, 10)}.json`);
const PAGE = 1000;

const say = (line: string) => process.stdout.write(`${line}\n`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    process.stderr.write('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. --env-file=.env.local)\n');
    process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** Same shape as src/lib/menu/imageLibrary.ts, which is server-only and cannot be imported here. */
async function loadLibrary(): Promise<PhotoLibrary> {
    const { data, error } = await db.from('default_images').select('image_url, diet');
    if (error) throw new Error(`default_images: ${error.message}`);
    const byName = new Map<string, { imageUrl: string }>();
    const entries: Array<{ name: string; diet: Diet | null }> = [];
    for (const row of (data ?? []) as Array<{ image_url: string | null; diet: Diet | null }>) {
        const name = libraryImageName(row.image_url);
        if (!name || !row.image_url || byName.has(name)) continue;
        byName.set(name, { imageUrl: row.image_url });
        entries.push({ name, diet: row.diet ?? null });
    }
    return { index: buildImageIndex(entries), byName };
}

async function loadProducts(): Promise<RepairableProduct[]> {
    const out: RepairableProduct[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await db
            .from('products')
            .select('id, site_id, name, food_type, dish_type, image_url')
            .like('image_url', '%/default-images/%')
            .order('id')
            .range(from, from + PAGE - 1);
        if (error) throw new Error(`products: ${error.message}`);
        out.push(...((data ?? []) as RepairableProduct[]));
        if (!data || data.length < PAGE) return out;
    }
}

const library = await loadLibrary();
const products = await loadProducts();
const plan = planLibraryPhotoRepair(products, library);

writeFileSync(OUT, JSON.stringify({ created: new Date().toISOString(), checked: products.length, plan }, null, 2));

const replaced = plan.filter((c) => c.to !== null).length;
const reasons = new Map<string, number>();
for (const c of plan) {
    const kind = c.reason.replace(/ \(.*\)$/, '');
    reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
}
say(APPLY ? 'APPLY: writing products.image_url' : 'DRY RUN: nothing is written (pass --apply to write)');
say(`library photos checked: ${products.length}, wrong: ${plan.length} (better photo: ${replaced}, photo removed: ${plan.length - replaced})`);
for (const [kind, n] of reasons) say(`  ${n}  ${kind}`);
for (const c of plan.slice(0, 15)) {
    say(`  ${c.name} — ${libraryImageName(c.from)} → ${c.to ? libraryImageName(c.to) : '(no photo)'}`);
}
if (plan.length > 15) say(`  … ${plan.length - 15} more in the plan file`);
say(`plan: ${OUT}`);

if (APPLY) {
    let written = 0;
    let skipped = 0;
    for (const change of plan) {
        const { data, error } = await db
            .from('products')
            .update({ image_url: change.to })
            .eq('id', change.id)
            .eq('image_url', change.from)
            .select('id');
        if (error) {
            skipped++;
            process.stderr.write(`  ✗ ${change.id} ${change.name}: ${error.message}\n`);
        } else if (!data || data.length === 0) {
            skipped++;
            say(`  – ${change.name}: photo changed since the plan, left as it is`);
        } else {
            written++;
        }
    }
    say(`written ${written}, skipped ${skipped}`);
}
