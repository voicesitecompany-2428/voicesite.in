// scripts/upgrade-menu-thumbs.mjs
// Recuts thumbnails made at 360 px (for the old 120 px list photo) at 450 px,
// which the 148 px photo needs on a 3x phone (148 × 3 = 444). New uploads are
// already cut at 450 by the app. See src/lib/menu/menuImages.ts.
//
// Companion to backfill-menu-thumbs.mjs, which stays add-only: that one makes
// missing thumbnails; this one replaces thumbnails that are too small.
//
// Safe by construction:
//   - DRY RUN unless --apply. The dry run reads only the thumbnails (~20 KB each)
//     to measure them; originals are read only with --apply.
//   - Writes only `<name>.thumb.jpg` objects, each recut from its own original.
//     An original is never written, re-encoded or deleted; nothing is deleted.
//   - A thumbnail is recut only when it is smaller than both 450 px and its
//     original's short side — it never gets "upgraded" past the source.
//   - If a recut fails, the old thumbnail stays and the menu keeps working.
//
// Caching (Supabase free plan, no Smart CDN): a thumbnail is served with a
// one-year cache under the same URL, so a phone or CDN edge that already holds
// the 360 px copy may keep showing it until that copy is evicted. New visitors
// and evicted edges get 450 px at once. The 360 px copy still displays
// correctly, only slightly soft. Run this before the app release that shows
// the 148 px photo, so most first fetches are already the 450 px file.
//
// Run:  node --env-file=.env.local scripts/upgrade-menu-thumbs.mjs
//       node --env-file=.env.local scripts/upgrade-menu-thumbs.mjs --apply

import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

// Must match THUMB_EDGE_PX / THUMB_QUALITY in src/lib/menu/menuImages.ts
// (tests/acceptance/data-hygiene.test.ts enforces it).
const THUMB_EDGE_PX = 450;
const THUMB_QUALITY = 0.85;
const CACHE_SECONDS = '31536000';
const THUMB_SUFFIX = '.thumb.jpg';
const BUCKETS = ['product-images', 'default-images'];
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;
const CONCURRENCY = 4;

/** Same rule as thumbObjectName() in menuImages.ts. */
export function thumbName(name) {
  if (name.endsWith(THUMB_SUFFIX)) return null;
  const slash = name.lastIndexOf('/');
  const dot = name.lastIndexOf('.');
  return `${dot > slash + 1 ? name.slice(0, dot) : name}${THUMB_SUFFIX}`;
}

/** A thumbnail is worth recutting only if the original can make it bigger. */
export function needsUpgrade(thumbEdge, originalShortSide) {
  return thumbEdge < Math.min(THUMB_EDGE_PX, originalShortSide);
}

const say = (line) => process.stdout.write(`${line}\n`);

async function main() {
  const APPLY = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    process.stderr.write('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. --env-file=.env.local)\n');
    process.exit(1);
  }
  // @napi-rs/canvas comes with pdfjs-dist (as in backfill-menu-thumbs.mjs);
  // imported here so the pure helpers above load without it.
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const db = createClient(url, key, { auth: { persistSession: false } });

  async function listAll(bucket, prefix = '') {
    const out = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset });
      if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
      for (const e of data) {
        const full = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.id === null) out.push(...(await listAll(bucket, full)));
        else out.push({ name: full, size: e.metadata?.size ?? 0 });
      }
      if (data.length < 1000) return out;
    }
  }

  async function bytesOf(bucket, name) {
    const { data, error } = await db.storage.from(bucket).download(name);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  /** Centre square, like the browser's makeMenuThumbnail(). */
  function cut(img) {
    const side = Math.min(img.width, img.height);
    const edge = Math.min(THUMB_EDGE_PX, side);
    const canvas = createCanvas(edge, edge);
    canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, edge, edge);
    return canvas.encode('jpeg', Math.round(THUMB_QUALITY * 100));
  }

  async function upgrade(bucket) {
    const files = await listAll(bucket);
    const names = new Set(files.map((f) => f.name));
    const pairs = files
      .filter((f) => IMAGE_EXT.test(f.name) && thumbName(f.name) && names.has(thumbName(f.name)))
      .map((f) => ({ original: f, target: thumbName(f.name) }));

    const stats = { checked: 0, small: 0, recut: 0, kept: 0, failed: 0, originalMb: 0 };
    let next = 0;
    async function worker() {
      while (next < pairs.length) {
        const { original, target } = pairs[next++];
        try {
          if (!target.endsWith(THUMB_SUFFIX)) throw new Error(`refusing to write ${target}`);
          const thumb = await loadImage(await bytesOf(bucket, target));
          stats.checked++;
          const thumbEdge = Math.min(thumb.width, thumb.height);
          if (thumbEdge >= THUMB_EDGE_PX) continue;
          stats.small++;
          stats.originalMb += original.size / 1048576;
          if (!APPLY) continue;

          const img = await loadImage(await bytesOf(bucket, original.name));
          if (!needsUpgrade(thumbEdge, Math.min(img.width, img.height))) { stats.kept++; continue; }
          const up = await db.storage.from(bucket).upload(target, await cut(img), {
            contentType: 'image/jpeg', cacheControl: CACHE_SECONDS, upsert: true,
          });
          if (up.error) throw up.error;
          stats.recut++;
        } catch (err) {
          stats.failed++;
          process.stderr.write(`  ✗ ${bucket}/${target}: ${err?.message ?? err}\n`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    say(`${bucket}: ${pairs.length} thumbnails, ${stats.small} under ${THUMB_EDGE_PX} px ` +
      `(${stats.originalMb.toFixed(1)} MB of originals to read)` +
      (APPLY ? `; recut ${stats.recut}, original too small ${stats.kept}, failed ${stats.failed}` : ''));
  }

  say(APPLY ? 'APPLY: recutting thumbnails' : 'DRY RUN: nothing is written (pass --apply to write)');
  for (const b of BUCKETS) await upgrade(b);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
