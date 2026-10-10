/**
 * Which owner uploads in `product-images` nothing points at any more.
 *
 * Photos replaced or deleted since 2026-09-26 are released one by one
 * (photoCleanup.ts). This finds the backlog from before that, and from deleted
 * stores and abandoned onboarding uploads (`temp/`). It only DECIDES;
 * scripts/sweep-unused-photos.ts lists the result for the owner and deletes a
 * reviewed list.
 *
 * Deleting from storage is permanent, so every rule errs towards keeping:
 *   - a file is "used" if its path appears in ANY reference — a dish photo, a
 *     banner, a profile avatar, or anywhere inside a dish's metadata JSON —
 *     matched both raw and URL-decoded, ignoring any ?query;
 *   - a thumbnail is kept while its original is kept;
 *   - anything younger than the grace period is kept: an upload lands in
 *     storage before the row that points at it is saved;
 *   - no references at all means the read failed, not that nothing is used.
 *
 * Pure: no I/O.
 */
import { thumbObjectName } from '@/lib/menu/menuImages';

export interface StoredObject {
    /** Object name in the bucket, e.g. "site-id/1727000000000.webp". */
    name: string;
    /** ISO timestamp the object was created. */
    createdAt: string;
}

export const UNUSED_GRACE_DAYS = 7;

const THUMB_SUFFIX = '.thumb.jpg';
const PLACEHOLDER = '.emptyFolderPlaceholder';
const UPLOAD_PATH = /\/storage\/v1\/object\/public\/product-images\/([^"'?#\s\\)]+)/g;

function referencedNames(references: readonly string[]): Set<string> {
    const used = new Set<string>();
    for (const ref of references) {
        for (const m of ref.matchAll(UPLOAD_PATH)) {
            used.add(m[1]);
            try { used.add(decodeURIComponent(m[1])); } catch { /* keep the raw form */ }
        }
    }
    return used;
}

/** Object names safe to delete, sorted. Throws when given no references. */
export function findUnusedPhotos(input: {
    objects: readonly StoredObject[];
    references: readonly string[];
    now: Date;
    graceDays?: number;
}): string[] {
    if (input.references.length === 0) {
        throw new Error('No references were read; refusing to treat every photo as unused.');
    }
    const used = referencedNames(input.references);
    const cutoff = input.now.getTime() - (input.graceDays ?? UNUSED_GRACE_DAYS) * 86_400_000;
    const settled = (o: StoredObject) => {
        const t = Date.parse(o.createdAt);
        return Number.isFinite(t) && t < cutoff;
    };

    const originals = input.objects.filter(o => !o.name.endsWith(THUMB_SUFFIX));
    const keptOriginals = new Set(
        originals.filter(o => used.has(o.name) || !settled(o)).map(o => o.name),
    );

    // thumbnail name → its originals
    const originalsOf = new Map<string, string[]>();
    for (const o of originals) {
        const t = thumbObjectName(o.name);
        if (t) originalsOf.set(t, [...(originalsOf.get(t) ?? []), o.name]);
    }

    const out: string[] = [];
    for (const o of input.objects) {
        if (o.name.endsWith(PLACEHOLDER)) continue;
        if (used.has(o.name) || !settled(o)) continue;
        if (o.name.endsWith(THUMB_SUFFIX)) {
            if ((originalsOf.get(o.name) ?? []).some(n => keptOriginals.has(n))) continue;
        } else if (keptOriginals.has(o.name)) {
            continue;
        }
        out.push(o.name);
    }
    return out.sort();
}
