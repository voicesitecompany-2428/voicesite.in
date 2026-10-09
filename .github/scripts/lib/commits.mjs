// Commit helpers shared by do-deploy.mjs and post-deploy-smoke.mjs.
// No dependencies (Node 20+).

import { execFileSync } from 'node:child_process';

/** "3d3c42e5aac5…" → "3d3c42e". */
export const short = (sha) => (sha ? String(sha).slice(0, 7) : '?');

/** Same commit, allowing either side to be abbreviated (at least 7 characters). */
export function sameCommit(a, b) {
    if (!a || !b) return false;
    const [x, y] = [String(a).toLowerCase(), String(b).toLowerCase()];
    return Math.min(x.length, y.length) >= 7 && (x.startsWith(y) || y.startsWith(x));
}

const SHA = /^[0-9a-f]{7,40}$/i;

/**
 * Whether `ancestor` is contained in `descendant`, by git: true, false, or null
 * when it cannot be told (a commit not fetched, no git, a private repo).
 *
 * Two merges in quick succession make DigitalOcean build the newer branch head
 * for the older run; that head contains the approved commit, so it is not a
 * mismatch. The newer commit is fetched first because this checkout was made
 * before it existed.
 */
export function gitIsAncestor(ancestor, descendant) {
    if (!SHA.test(String(ancestor)) || !SHA.test(String(descendant))) return null;
    try {
        execFileSync('git', ['fetch', '--quiet', '--no-tags', 'origin', String(descendant)], { stdio: 'ignore', timeout: 60_000 });
    } catch {
        // Already present, or not fetchable; merge-base below decides.
    }
    try {
        execFileSync('git', ['merge-base', '--is-ancestor', String(ancestor), String(descendant)], { stdio: 'ignore' });
        return true;
    } catch (err) {
        // Exit 1 means "not an ancestor"; anything else means git could not tell.
        return err?.status === 1 ? false : null;
    }
}
