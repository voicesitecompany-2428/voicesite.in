#!/usr/bin/env node
// post-deploy-smoke.mjs — right after a production deploy, checks what owners
// and diners rely on. Run by .github/workflows/deploy.yml; any failure rolls the
// release back. Also runs against a local `next start`. Runbook: docs/ci-cd.md
//
//   node .github/scripts/post-deploy-smoke.mjs <base-url> [--expect-sha <sha>]
//
// Every request either reads a public page or is one the app must REFUSE
// (signed-out owner pages, the frozen order route). Nothing here can write
// data, and no menu page is loaded, so no customer scan is ever recorded.
//
// No dependencies (Node 20+). Exit 0 = healthy, 1 = a check failed.

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gitIsAncestor, sameCommit, short } from './lib/commits.mjs';

const REDIRECT = [301, 302, 303, 307, 308];

export const SMOKE_CHECKS = [
    { id: 'home', label: 'Home page loads', path: '/', expect: { status: [200], type: 'text/html' } },
    { id: 'pricing', label: 'Pricing page loads', path: '/pricing', expect: { status: [200], type: 'text/html' } },
    { id: 'login', label: 'Sign-in page loads', path: '/login', expect: { status: [200], type: 'text/html' } },
    { id: 'sitemap', label: 'Sitemap is served', path: '/sitemap.xml', expect: { status: [200], body: '<urlset' } },
    { id: 'version', label: 'The approved commit is serving', path: '/api/version', expect: { status: [200], version: true } },
    { id: 'dashboard-gated', label: 'Dashboard needs sign-in', path: '/manage/dashboard', expect: { status: REDIRECT } },
    {
        id: 'owner-api-gated', label: 'Owner API needs sign-in',
        path: '/api/manage/menu-summary?site_id=00000000-0000-4000-8000-000000000000', expect: { status: [401] },
    },
    // vsite takes no orders (CLAUDE.md, "The ordering freeze"). The freeze check is
    // the route's first statement, so this request is refused before anything runs.
    {
        id: 'ordering-frozen', label: 'Ordering stays frozen', method: 'POST', path: '/api/orders', body: '{}',
        expect: { status: [403], body: 'FEATURE_FROZEN' },
    },
];

const NO_COMMIT = 'The app does not report its commit yet: set COMMIT_SHA = ${_self.COMMIT_HASH} on the web component in DigitalOcean (docs/ci-cd.md, step 2).';

async function probe(base, check, fetchImpl) {
    const res = await fetchImpl(`${base}${check.path}`, {
        method: check.method ?? 'GET',
        redirect: 'manual',
        headers: { 'user-agent': 'vsite-post-deploy-smoke/1', ...(check.body ? { 'content-type': 'application/json' } : {}) },
        body: check.body,
        signal: AbortSignal.timeout(20_000),
    });
    return { status: res.status, type: res.headers.get('content-type') ?? '', body: (await res.text()).slice(0, 4000) };
}

/** Whether one response meets its check. */
export async function evaluate(check, res, { expectSha, isAncestor }) {
    const e = check.expect;
    if (!e.status.includes(res.status)) return { ok: false, detail: `HTTP ${res.status}, expected ${e.status.join(' or ')}` };
    if (e.type && !res.type.includes(e.type)) return { ok: false, detail: `content-type "${res.type || 'none'}", expected ${e.type}` };
    if (e.body && !res.body.includes(e.body)) return { ok: false, detail: `response does not contain ${e.body}` };
    if (!e.version) return { ok: true, detail: `HTTP ${res.status}` };

    let sha;
    try { sha = String(JSON.parse(res.body).sha ?? 'unknown'); } catch { return { ok: false, detail: '/api/version did not return JSON' }; }
    if (!expectSha) return { ok: true, detail: `serving ${short(sha)}` };
    if (sha === 'unknown') return { ok: true, detail: 'commit not reported', warn: NO_COMMIT };
    if (sameCommit(sha, expectSha)) return { ok: true, detail: `serving ${short(sha)}` };
    if ((await isAncestor(expectSha, sha)) === true) {
        return { ok: true, detail: `serving ${short(sha)}`, warn: `A newer commit (${short(sha)}) is live and contains ${short(expectSha)}.` };
    }
    return { ok: false, detail: `serving ${short(sha)}, expected ${short(expectSha)}` };
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs every check, retrying a failing one a few times: right after the switch
 * the new version may still be warming up behind the load balancer.
 */
export async function runSmoke({
    base, expectSha, isAncestor = async () => null, fetchImpl = fetch,
    attempts = 4, delayMs = 5_000, sleep = pause, checks = SMOKE_CHECKS,
}) {
    const root = base.replace(/\/$/, '');
    const results = [];
    for (const check of checks) {
        let outcome = { ok: false, detail: 'not run' };
        let n = 0;
        while (n < attempts) {
            n += 1;
            try {
                outcome = await evaluate(check, await probe(root, check, fetchImpl), { expectSha, isAncestor });
            } catch (err) {
                outcome = { ok: false, detail: `request failed: ${err?.message ?? err}` };
            }
            if (outcome.ok) break;
            if (n < attempts) await sleep(delayMs);
        }
        results.push({ id: check.id, label: check.label, attempts: n, ...outcome });
    }
    return { ok: results.every((r) => r.ok), results };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main(argv) {
    const base = argv[0];
    if (!/^https?:\/\//.test(base ?? '')) throw new Error('Usage: post-deploy-smoke.mjs <base-url> [--expect-sha <sha>]');
    const i = argv.indexOf('--expect-sha');
    const expectSha = i > 0 ? argv[i + 1] : undefined;

    const { ok, results } = await runSmoke({ base, expectSha, isAncestor: async (a, b) => gitIsAncestor(a, b) });
    const say = (line) => process.stdout.write(`${line}\n`);
    say(`Smoke test ${base}${expectSha ? ` (expecting ${short(expectSha)})` : ''}`);
    for (const r of results) {
        say(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(32)} ${r.detail}${r.attempts > 1 ? ` (attempt ${r.attempts})` : ''}`);
        if (r.warn) say(`::warning title=Smoke test::${r.warn}`);
        if (!r.ok) say(`::error title=Smoke test failed::${r.label}: ${r.detail}`);
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
            `### Smoke test — ${ok ? 'passed' : 'FAILED'}`, '', '| Check | Result |', '|---|---|',
            ...results.map((r) => `| ${r.label} | ${r.ok ? '✅' : '❌'} ${r.detail} |`), '', '',
        ].join('\n'));
    }
    say(ok ? 'All checks passed.' : 'Smoke test FAILED.');
    process.exitCode = ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main(process.argv.slice(2)).catch((err) => {
        process.stdout.write(`::error title=Smoke test::${err?.message ?? err}\n`);
        process.exitCode = 1;
    });
}
