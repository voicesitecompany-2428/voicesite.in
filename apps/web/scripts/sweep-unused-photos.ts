// scripts/sweep-unused-photos.ts
//
// Removes owner uploads that nothing points at any more: photos replaced or
// deleted before per-photo cleanup shipped (2026-09-26), photos of deleted
// stores, and abandoned onboarding uploads in temp/. The rules are in
// src/lib/menu/unusedPhotos.ts.
//
// Deleting from storage cannot be undone, so this is two separate steps:
//
//   1. DRY RUN (default) — lists every unused photo into a manifest file and
//      prints a summary. Nothing is deleted. Open the manifest; it is the
//      exact list step 2 may delete.
//   2. --apply <manifest> — re-lists the bucket and re-reads every reference
//      NOW, and deletes a file only if it is in the manifest AND still unused.
//      Anything that came back into use since the dry run is kept and reported.
//
// Only the owners' bucket (product-images) is ever touched. The shared food
// library (default-images) is never listed, never deleted from.
//
// A photo counts as used if its path appears in a dish photo or a dish's
// metadata, a banner, a profile avatar, a store's social links, or a saved
// order's items. Uploads newer than 7 days are always kept (the file lands
// before the row that points at it is saved).
//
// Run (from apps/web):
//   node --env-file=.env.local --import ./scripts/lib/register-ts.mjs scripts/sweep-unused-photos.ts
//   node --env-file=.env.local --import ./scripts/lib/register-ts.mjs scripts/sweep-unused-photos.ts --apply <manifest.json>
// Options: --out <file>  where the dry run writes the manifest (default: the OS temp folder)

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findUnusedPhotos, type StoredObject } from '@/lib/menu/unusedPhotos';

const BUCKET = 'product-images';
const PAGE = 1000;
const REMOVE_BATCH = 100;

const arg = (flag: string) => {
    const i = process.argv.indexOf(flag);
    return i > 0 ? process.argv[i + 1] : undefined;
};
const MANIFEST = arg('--apply');
const APPLY = process.argv.includes('--apply');
const OUT = arg('--out') ?? join(tmpdir(), `vsite-unused-photos-${new Date().toISOString().slice(0, 10)}.json`);

const say = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string): never => {
    process.stderr.write(`${line}\n`);
    process.exit(1);
};

if (APPLY && (!MANIFEST || MANIFEST.startsWith('--'))) fail('--apply needs the manifest written by the dry run: --apply <manifest.json>');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. --env-file=.env.local)');
const db = createClient(url as string, key as string, { auth: { persistSession: false } });

interface Listed extends StoredObject { size: number }

async function listAll(prefix = ''): Promise<Listed[]> {
    const out: Listed[] = [];
    for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
        if (error) throw new Error(`${BUCKET}/${prefix}: ${error.message}`);
        for (const e of data) {
            const name = prefix ? `${prefix}/${e.name}` : e.name;
            if (e.id === null) out.push(...(await listAll(name))); // folder
            else out.push({ name, createdAt: e.created_at ?? '', size: Number(e.metadata?.size ?? 0) });
        }
        if (data.length < PAGE) return out;
    }
}

/** Every stored value that can hold a photo URL, as text. */
async function readReferences(): Promise<string[]> {
    const sources: Array<[string, string]> = [
        ['products', 'image_url, metadata'],
        ['banners', 'image_url'],
        ['profiles', 'avatar_url'],
        ['sites', 'social_links'],
        ['orders', 'items'],
    ];
    const refs: string[] = [];
    for (const [table, columns] of sources) {
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await db.from(table).select(columns).range(from, from + PAGE - 1);
            // A source that cannot be read must stop the sweep: treating its
            // photos as unused is exactly the mistake this script cannot make.
            if (error) throw new Error(`${table}: ${error.message}`);
            for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
                for (const v of Object.values(row)) if (v !== null && v !== undefined) refs.push(typeof v === 'string' ? v : JSON.stringify(v));
            }
            if (!data || data.length < PAGE) break;
        }
    }
    return refs;
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

const objects = await listAll();
const references = await readReferences();
const unused = new Set(findUnusedPhotos({ objects, references, now: new Date() }));
const sizeOf = new Map(objects.map((o) => [o.name, o.size]));

if (!APPLY) {
    const files = [...unused].map((name) => ({ name, size: sizeOf.get(name) ?? 0 }));
    const total = files.reduce((s, f) => s + f.size, 0);
    writeFileSync(OUT, JSON.stringify({ bucket: BUCKET, created: new Date().toISOString(), files, totalBytes: total }, null, 2));
    const byFolder = new Map<string, number>();
    for (const f of files) {
        const folder = f.name.includes('/') ? f.name.slice(0, f.name.indexOf('/')) : '(root)';
        byFolder.set(folder, (byFolder.get(folder) ?? 0) + 1);
    }
    say('DRY RUN: nothing is deleted');
    say(`${BUCKET}: ${objects.length} files, ${files.length} unused (${mb(total)})`);
    for (const [folder, n] of [...byFolder].sort((a, b) => b[1] - a[1])) say(`  ${n}  ${folder}/`);
    say(`manifest: ${OUT}`);
    say(`review it, then: … scripts/sweep-unused-photos.ts --apply "${OUT}"`);
} else {
    const manifest = JSON.parse(readFileSync(MANIFEST as string, 'utf8')) as { bucket: string; files: Array<{ name: string }> };
    if (manifest.bucket !== BUCKET) fail(`manifest is for bucket "${manifest.bucket}", expected ${BUCKET}`);
    const listed = manifest.files.map((f) => f.name);
    const toDelete = listed.filter((n) => unused.has(n));
    const kept = listed.filter((n) => !unused.has(n));
    say(`APPLY: ${toDelete.length} of ${listed.length} manifest files are still unused`);
    for (const n of kept) say(`  kept (in use or gone since the dry run): ${n}`);

    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += REMOVE_BATCH) {
        const batch = toDelete.slice(i, i + REMOVE_BATCH);
        const { data, error } = await db.storage.from(BUCKET).remove(batch);
        if (error) {
            process.stderr.write(`  ✗ batch ${i / REMOVE_BATCH + 1}: ${error.message}\n`);
            continue;
        }
        deleted += data?.length ?? 0;
    }
    const freed = toDelete.reduce((s, n) => s + (sizeOf.get(n) ?? 0), 0);
    say(`deleted ${deleted} files (${mb(freed)})`);
}
