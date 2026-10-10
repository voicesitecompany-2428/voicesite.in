/**
 * Acceptance: CI/CD Phase 1 (`ci-cd-pipeline`, 2026-10-09).
 *
 * Before this change (measured on GitHub, 2026-10-09):
 *   - CI failed 17 of 17 runs since 2026-09-21, including all 5 pushes to
 *     master — every one of which DigitalOcean deployed anyway
 *     (`deploy_on_push`), because nothing gated production.
 *   - master had no branch protection and no rules on either repo.
 *   - `npm audit` never ran (the step after the always-failing tests), so 2
 *     critical + 11 high advisories in production dependencies went unseen.
 *
 * After: a pull request must pass `verify` and `audit` and be approved; a merge
 * to master runs CI again, waits for the owner's approval, deploys through the
 * DigitalOcean API, proves the approved commit is the one serving, smoke-tests
 * production and rolls back automatically if anything fails.
 *
 * Workflows are YAML; they are checked here as text (no YAML dependency in the
 * repo), and their scripts are imported and run against mocked APIs.
 */
import { describe, it, expect, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(__dirname, '../../../..');
const WEB = join(ROOT, 'apps/web');
// Windows checkouts may carry CRLF; the runner's are LF. Compare as LF.
const lf = (s: string) => s.replace(/\r\n/g, '\n');
const read = (p: string) => (existsSync(join(ROOT, p)) ? lf(readFileSync(join(ROOT, p), 'utf8')) : '');
const script = (name: string) => import(pathToFileURL(join(ROOT, '.github/scripts', name)).href);

const CI = () => read('.github/workflows/ci.yml');
const DEPLOY = () => read('.github/workflows/deploy.yml');
const WORKFLOWS = () => readdirSync(join(ROOT, '.github/workflows'))
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => ({ file: f, text: lf(readFileSync(join(ROOT, '.github/workflows', f), 'utf8')) }));

/** The body of every `run:` step (single-line and `|` blocks). */
function runBlocks(yaml: string): string[] {
    const lines = yaml.split(/\r?\n/);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const m = /^(\s*)(?:- )?run:\s*(.*)$/.exec(lines[i]);
        if (!m) continue;
        if (m[2] && !/^[|>]/.test(m[2])) { out.push(m[2]); continue; }
        const indent = m[1].length;
        const body: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim() === '') { body.push(''); continue; }
            if (/^\s*/.exec(lines[j])![0].length <= indent) break;
            body.push(lines[j]);
        }
        out.push(body.join('\n'));
    }
    return out;
}

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the pull-request gate can actually pass, and checks the right things
// ─────────────────────────────────────────────────────────────────────────────

describe('AC1: CI is the pull-request gate', () => {
    it('runs on every pull request into master and can be called by the deploy workflow', () => {
        expect(CI()).toMatch(/pull_request:\s*\n\s+branches:\s*\[master\]/);
        expect(CI()).toMatch(/\n\s+workflow_call:/);
    });

    it('has the two required checks, named exactly as the ruleset expects', () => {
        expect(CI()).toMatch(/\n  verify:\n\s+name: verify\n/);
        expect(CI()).toMatch(/\n  audit:\n\s+name: audit\n/);
    });

    it('verify runs typecheck, lint and the whole test suite', () => {
        expect(CI()).toMatch(/npx tsc --noEmit/);
        expect(CI()).toMatch(/npm run lint/);
        expect(CI()).toMatch(/npx vitest run/);
    });

    it('skips only the Claude Code hook tests, whose scripts can never exist on a runner — the cause of 17/17 red runs', () => {
        expect(CI()).toMatch(/npx vitest run --exclude "tests\/unit\/claude-hooks\/\*\*"/);
        // Excluded in CI, not edited: the tests themselves are unchanged.
        expect(existsSync(join(WEB, 'tests/unit/claude-hooks/db-readonly.test.ts'))).toBe(true);
    });

    it('audit gates production dependencies through the reviewed exceptions file', () => {
        expect(CI()).toMatch(/node \.github\/scripts\/audit-gate\.mjs/);
    });

    it('reads the Node version from package.json, the same file DigitalOcean reads', () => {
        expect(CI()).toMatch(/node-version-file: apps\/web\/package\.json/);
        const pkg = JSON.parse(readFileSync(join(WEB, 'package.json'), 'utf8'));
        expect(pkg.engines?.node).toBe('22.x');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — workflows follow GitHub's security hardening guidance
// ─────────────────────────────────────────────────────────────────────────────

describe('AC2: every workflow is hardened', () => {
    it('pins every third-party action to a full commit SHA, with the version beside it', () => {
        for (const { file, text } of WORKFLOWS()) {
            for (const m of text.matchAll(/uses:\s*([^\s#]+)(.*)/g)) {
                const [ref, rest] = [m[1], m[2]];
                if (ref.startsWith('./')) continue; // a workflow in this repo
                expect(ref, `${file}: ${ref}`).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
                expect(rest, `${file}: ${ref} needs a "# vX.Y.Z" comment`).toMatch(/#\s*v\d+/);
            }
        }
    });

    it('gives the GITHUB_TOKEN read-only access by default', () => {
        for (const { file, text } of WORKFLOWS()) {
            expect(text, file).toMatch(/\npermissions:\s*\n\s+contents:\s*read/);
        }
    });

    it('bounds every job with a timeout', () => {
        for (const { file, text } of WORKFLOWS()) {
            const jobs = [...text.matchAll(/\n  ([\w-]+):\n((?: {4}.*\n|\s*\n)+)/g)].filter((j) => /runs-on:/.test(j[2]));
            for (const [, name, body] of jobs) expect(body, `${file}: ${name}`).toMatch(/timeout-minutes:\s*\d+/);
        }
    });

    it('never interpolates ${{ }} expressions inside shell scripts (script injection)', () => {
        for (const { file, text } of WORKFLOWS()) {
            for (const body of runBlocks(text)) expect(body, `${file}: ${body}`).not.toMatch(/\$\{\{/);
        }
    });

    it('does not leave git credentials on disk for later steps', () => {
        for (const { file, text } of WORKFLOWS()) {
            const checkouts = text.match(/uses: actions\/checkout@/g) ?? [];
            const disabled = text.match(/persist-credentials: false/g) ?? [];
            expect(disabled.length, file).toBe(checkouts.length);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — master → production only after CI and the owner's approval
// ─────────────────────────────────────────────────────────────────────────────

describe('AC3: the deploy workflow', () => {
    it('runs for every commit on master, and can be re-run by hand', () => {
        expect(DEPLOY()).toMatch(/push:\s*\n\s+branches:\s*\[master\]/);
        expect(DEPLOY()).toMatch(/workflow_dispatch:/);
    });

    it('runs the full CI on the exact commit first', () => {
        expect(DEPLOY()).toMatch(/uses: \.\/\.github\/workflows\/ci\.yml/);
        expect(DEPLOY()).toMatch(/needs: ci/);
    });

    it('deploys through the protected `production` environment, so the owner approves each release', () => {
        expect(DEPLOY()).toMatch(/environment:\s*\n\s+name: production\n\s+url: https:\/\/vsite\.in/);
    });

    it('never runs two production deploys at once, and never cancels one halfway', () => {
        expect(DEPLOY()).toMatch(/concurrency:\s*\n\s+group: deploy-production\n\s+cancel-in-progress: false/);
    });

    it('exposes the DigitalOcean token only to the steps that call DigitalOcean', () => {
        expect(DEPLOY()).not.toMatch(/^env:/m);
        const uses = DEPLOY().match(/DIGITALOCEAN_ACCESS_TOKEN: \$\{\{ secrets\.DIGITALOCEAN_ACCESS_TOKEN \}\}/g) ?? [];
        expect(uses.length).toBe(2); // the deploy step and the rollback step
    });

    it('deploys, smoke-tests, probes the CDN, and rolls back on any failure after a successful deploy', () => {
        expect(DEPLOY()).toMatch(/node \.github\/scripts\/do-deploy\.mjs deploy/);
        expect(DEPLOY()).toMatch(/node \.github\/scripts\/post-deploy-smoke\.mjs/);
        expect(DEPLOY()).toMatch(/node \.github\/scripts\/edge-cache-guard\.mjs "\$SITE_URL" --full/);
        expect(DEPLOY()).toMatch(/if: failure\(\) && steps\.deploy\.outputs\.deployed == 'true' && steps\.deploy\.outputs\.previous_deployment_id != ''/);
        expect(DEPLOY()).toMatch(/node \.github\/scripts\/do-deploy\.mjs rollback/);
    });

    it('stops DigitalOcean from deploying on its own, and checks the app is healthy before it takes traffic', () => {
        const spec = read('apps/web/.do/app.yaml');
        expect(spec).not.toMatch(/deploy_on_push:\s*true/);
        expect((spec.match(/deploy_on_push:\s*false/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(spec).toMatch(/health_check:\s*\n\s+http_path: \/api\/version/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — the deploy script proves what went live, and rolls back
// ─────────────────────────────────────────────────────────────────────────────

type Dep = { id: string; phase: string; services?: Array<{ name: string; source_commit_hash?: string }> };

function fakeDo(opts: { phases: string[]; commit?: string; active?: string | null; inProgress?: string | null; rollbackPhases?: string[] }) {
    const calls: string[] = [];
    let poll = 0;
    let rollbackPoll = 0;
    let consoleDeployDone = false;
    const svc = (c?: string) => [{ name: 'web', source_commit_hash: c }];
    const api = {
        getApp: vi.fn(async () => {
            calls.push('getApp');
            return {
                active_deployment: opts.active === null ? undefined : { id: opts.active ?? 'dep-prev' },
                in_progress_deployment: opts.inProgress && !consoleDeployDone ? { id: opts.inProgress } : undefined,
            };
        }),
        createDeployment: vi.fn(async () => { calls.push('create'); return { id: 'dep-new', phase: 'PENDING_BUILD' }; }),
        getDeployment: vi.fn(async (_app: string, id: string): Promise<Dep> => {
            calls.push(`get:${id}`);
            if (id === 'dep-rollback') {
                const p = opts.rollbackPhases ?? ['DEPLOYING', 'ACTIVE'];
                return { id, phase: p[Math.min(rollbackPoll++, p.length - 1)], services: svc(SHA_B) };
            }
            if (id === opts.inProgress) { consoleDeployDone = true; return { id, phase: 'ACTIVE', services: svc(SHA_B) }; }
            const phase = opts.phases[Math.min(poll++, opts.phases.length - 1)];
            return { id, phase, services: svc(opts.commit) };
        }),
        rollback: vi.fn(async (_app: string, to: string) => { calls.push(`rollback:${to}`); return { id: 'dep-rollback', phase: 'PENDING_DEPLOY' }; }),
    };
    return { api, calls };
}

const quiet = { sleep: async () => {}, log: () => {}, notice: () => {}, pollMs: 1, timeoutMs: 60_000 };

describe('AC4: do-deploy.mjs', () => {
    it('records the live deployment as the rollback target, deploys, waits for ACTIVE and confirms the commit', async () => {
        const { deploy } = await script('do-deploy.mjs');
        const { api, calls } = fakeDo({ phases: ['BUILDING', 'DEPLOYING', 'ACTIVE'], commit: SHA_A });
        const r = await deploy({ api, appId: 'app', commit: SHA_A, isAncestor: async () => false, ...quiet });
        expect(r).toMatchObject({ previousDeploymentId: 'dep-prev', deploymentId: 'dep-new', deployedCommit: SHA_A, phase: 'ACTIVE' });
        expect(calls.indexOf('getApp')).toBeLessThan(calls.indexOf('create'));
    });

    it('fails without rolling back when the build or deploy fails — production still serves the old version', async () => {
        const { deploy } = await script('do-deploy.mjs');
        const { api } = fakeDo({ phases: ['BUILDING', 'ERROR'], commit: SHA_A });
        const err = await deploy({ api, appId: 'app', commit: SHA_A, isAncestor: async () => false, ...quiet }).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(Error);
        expect((err as { deployed: boolean }).deployed).toBe(false);
        expect(String((err as Error).message)).toMatch(/ERROR/);
    });

    it('fails AFTER going live when DigitalOcean deployed a commit nobody approved — so the workflow rolls back', async () => {
        const { deploy } = await script('do-deploy.mjs');
        const { api } = fakeDo({ phases: ['ACTIVE'], commit: SHA_B });
        const err = await deploy({ api, appId: 'app', commit: SHA_A, isAncestor: async () => false, ...quiet }).catch((e: unknown) => e) as { deployed: boolean; result: { previousDeploymentId: string } };
        expect(err.deployed).toBe(true);
        expect(err.result.previousDeploymentId).toBe('dep-prev');
    });

    it('accepts a newer commit that already contains the approved one (two merges in a row)', async () => {
        const { deploy } = await script('do-deploy.mjs');
        const { api } = fakeDo({ phases: ['ACTIVE'], commit: SHA_B });
        const r = await deploy({ api, appId: 'app', commit: SHA_A, isAncestor: async (a: string, b: string) => a === SHA_A && b === SHA_B, ...quiet });
        expect(r.deployedCommit).toBe(SHA_B);
    });

    it('waits for a deployment someone started in the console before starting its own', async () => {
        const { deploy } = await script('do-deploy.mjs');
        const { api, calls } = fakeDo({ phases: ['ACTIVE'], commit: SHA_A, inProgress: 'dep-console' });
        await deploy({ api, appId: 'app', commit: SHA_A, isAncestor: async () => false, ...quiet });
        expect(calls.indexOf('get:dep-console')).toBeLessThan(calls.indexOf('create'));
    });

    it('gives up with a clear error when a deployment never finishes', async () => {
        const { deploy } = await script('do-deploy.mjs');
        const { api } = fakeDo({ phases: ['BUILDING'], commit: SHA_A });
        let t = 0;
        const err = await deploy({ api, appId: 'app', commit: SHA_A, isAncestor: async () => false, ...quiet, timeoutMs: 50, now: () => (t += 20) }).catch((e: unknown) => e) as Error & { deployed: boolean };
        expect(err.message).toMatch(/did not finish/i);
        expect(err.deployed).toBe(false);
    });

    it('rolls back to the recorded deployment without pinning the app, and waits until it is live', async () => {
        const { rollback } = await script('do-deploy.mjs');
        const { api } = fakeDo({ phases: ['ACTIVE'] });
        const r = await rollback({ api, appId: 'app', toDeploymentId: 'dep-prev', ...quiet });
        expect(api.rollback).toHaveBeenCalledWith('app', 'dep-prev');
        expect(r.phase).toBe('ACTIVE');
    });

    it('sends skip_pin: true, so the next fixed release is not blocked by the rollback', async () => {
        const { createApi } = await script('do-deploy.mjs');
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ deployment: { id: 'd', phase: 'PENDING_DEPLOY' } }), { status: 200 }));
        await createApi({ token: 't', fetchImpl }).rollback('app-1', 'dep-prev');
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('https://api.digitalocean.com/v2/apps/app-1/rollback');
        expect(JSON.parse(String(init.body))).toEqual({ deployment_id: 'dep-prev', skip_pin: true });
        expect((init.headers as Record<string, string>).authorization).toBe('Bearer t');
    });

    it('reports a DigitalOcean API error by its message only — the Actions log of a public repo is public', async () => {
        const { createApi } = await script('do-deploy.mjs');
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: 'unauthorized', message: 'Unable to authenticate you' }), { status: 401 }));
        const err = await createApi({ token: 'secret-token', fetchImpl }).getApp('app-1').catch((e: unknown) => e) as Error;
        expect(err.message).toMatch(/401/);
        expect(err.message).toMatch(/Unable to authenticate you/);
        expect(err.message).not.toMatch(/secret-token/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC5 — the smoke test checks what owners and diners rely on
// ─────────────────────────────────────────────────────────────────────────────

type Reply = { status: number; type?: string; body?: string; location?: string };
function fakeSite(routes: Record<string, Reply | Reply[]>) {
    const seen: Record<string, number> = {};
    return vi.fn(async (url: string, init?: RequestInit) => {
        const key = `${init?.method ?? 'GET'} ${new URL(url).pathname}`;
        const r = routes[key];
        const reply = Array.isArray(r) ? r[Math.min((seen[key] = (seen[key] ?? -1) + 1), r.length - 1)] : r;
        if (!reply) return new Response('not found', { status: 404 });
        const headers: Record<string, string> = { 'content-type': reply.type ?? 'text/html; charset=utf-8' };
        if (reply.location) headers.location = reply.location;
        return new Response(reply.body ?? '<html></html>', { status: reply.status, headers });
    });
}

const HEALTHY: Record<string, Reply> = {
    'GET /': { status: 200 },
    'GET /pricing': { status: 200 },
    'GET /login': { status: 200 },
    'GET /sitemap.xml': { status: 200, type: 'application/xml', body: '<?xml version="1.0"?><urlset></urlset>' },
    'GET /api/version': { status: 200, type: 'application/json', body: JSON.stringify({ sha: SHA_A }) },
    'GET /manage/dashboard': { status: 307, location: '/login' },
    'GET /api/manage/menu-summary': { status: 401, type: 'application/json', body: '{"error":"Unauthorized"}' },
    'POST /api/orders': { status: 403, type: 'application/json', body: '{"error":"This feature is temporarily unavailable.","code":"FEATURE_FROZEN"}' },
};

const smokeOpts = { expectSha: SHA_A, isAncestor: async () => false, attempts: 3, sleep: async () => {} };

describe('AC5: post-deploy-smoke.mjs', () => {
    it('checks pages, sign-in walls, the frozen ordering and the deployed commit', async () => {
        const { SMOKE_CHECKS } = await script('post-deploy-smoke.mjs');
        const names = (SMOKE_CHECKS as Array<{ id: string }>).map((c) => c.id);
        expect(names).toEqual(['home', 'pricing', 'login', 'sitemap', 'version', 'dashboard-gated', 'owner-api-gated', 'ordering-frozen']);
    });

    it('passes a healthy release', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: fakeSite(HEALTHY), ...smokeOpts });
        expect(r.ok).toBe(true);
        expect(r.results.every((x: { ok: boolean }) => x.ok)).toBe(true);
    });

    it('fails when the site is down', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: fakeSite({ ...HEALTHY, 'GET /': { status: 502 } }), ...smokeOpts });
        expect(r.ok).toBe(false);
        expect(r.results.find((x: { id: string }) => x.id === 'home').ok).toBe(false);
    });

    it('fails when an owner page or API answers without signing in', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const open = { ...HEALTHY, 'GET /manage/dashboard': { status: 200 }, 'GET /api/manage/menu-summary': { status: 200, type: 'application/json', body: '{}' } };
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: fakeSite(open), ...smokeOpts });
        const failed = r.results.filter((x: { ok: boolean }) => !x.ok).map((x: { id: string }) => x.id);
        expect(failed).toEqual(['dashboard-gated', 'owner-api-gated']);
    });

    it('fails when ordering is no longer frozen — vsite takes no orders', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: fakeSite({ ...HEALTHY, 'POST /api/orders': { status: 400, type: 'application/json', body: '{"error":"Invalid order"}' } }), ...smokeOpts });
        expect(r.results.find((x: { id: string }) => x.id === 'ordering-frozen').ok).toBe(false);
    });

    it('fails when a different, unrelated commit is serving', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: fakeSite({ ...HEALTHY, 'GET /api/version': { status: 200, type: 'application/json', body: JSON.stringify({ sha: SHA_B }) } }), ...smokeOpts });
        expect(r.results.find((x: { id: string }) => x.id === 'version').ok).toBe(false);
    });

    it('passes with a warning when the app does not report its commit yet (COMMIT_SHA not set in DigitalOcean)', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: fakeSite({ ...HEALTHY, 'GET /api/version': { status: 200, type: 'application/json', body: '{"sha":"unknown"}' } }), ...smokeOpts });
        const v = r.results.find((x: { id: string }) => x.id === 'version');
        expect(v.ok).toBe(true);
        expect(v.warn).toMatch(/COMMIT_SHA/);
    });

    it('retries a check that fails while the new version is still warming up', async () => {
        const { runSmoke } = await script('post-deploy-smoke.mjs');
        const site = fakeSite({ ...HEALTHY, 'GET /': [{ status: 503 }, { status: 503 }, { status: 200 }] });
        const r = await runSmoke({ base: 'https://vsite.in', fetchImpl: site, ...smokeOpts });
        const home = r.results.find((x: { id: string }) => x.id === 'home');
        expect(home.ok).toBe(true);
        expect(home.attempts).toBe(3);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC6 — the audit gate: new advisories block, known ones carry a deadline
// ─────────────────────────────────────────────────────────────────────────────

/** The shape `npm audit --json` (npm 7+) prints. */
const AUDIT = {
    vulnerabilities: {
        next: { severity: 'critical', via: [{ source: 1, name: 'next', title: 'DoS', url: 'https://github.com/advisories/GHSA-aaaa-aaaa-aaaa', severity: 'critical', range: '<15.5.10' }] },
        ws: { severity: 'high', via: [{ source: 2, name: 'ws', title: 'Memory', url: 'https://github.com/advisories/GHSA-bbbb-bbbb-bbbb', severity: 'high', range: '<8.21.0' }] },
        postcss: { severity: 'high', via: ['next'] },
        nanoid: { severity: 'moderate', via: [{ source: 3, name: 'nanoid', title: 'Loop', url: 'https://github.com/advisories/GHSA-cccc-cccc-cccc', severity: 'moderate', range: '<3.3.16' }] },
    },
};

describe('AC6: audit-gate.mjs', () => {
    it('reads each advisory once, by its GitHub advisory ID', async () => {
        const { advisoriesFrom } = await script('audit-gate.mjs');
        const ids = advisoriesFrom(AUDIT).map((a: { id: string }) => a.id).sort();
        expect(ids).toEqual(['GHSA-aaaa-aaaa-aaaa', 'GHSA-bbbb-bbbb-bbbb', 'GHSA-cccc-cccc-cccc']);
    });

    it('blocks a high or critical advisory nobody has reviewed', async () => {
        const { advisoriesFrom, gate } = await script('audit-gate.mjs');
        const r = gate({ advisories: advisoriesFrom(AUDIT), allowlist: { accepted: [] }, today: '2026-10-09' });
        expect(r.ok).toBe(false);
        expect(r.blocking.map((a: { id: string }) => a.id).sort()).toEqual(['GHSA-aaaa-aaaa-aaaa', 'GHSA-bbbb-bbbb-bbbb']);
    });

    it('lets a reviewed advisory through until its deadline, then blocks again', async () => {
        const { advisoriesFrom, gate } = await script('audit-gate.mjs');
        const allowlist = { accepted: [
            { id: 'GHSA-aaaa-aaaa-aaaa', package: 'next', reason: 'Next.js upgrade planned', expires: '2026-10-23' },
            { id: 'GHSA-bbbb-bbbb-bbbb', package: 'ws', reason: 'npm audit fix PR', expires: '2026-10-23' },
        ] };
        expect(gate({ advisories: advisoriesFrom(AUDIT), allowlist, today: '2026-10-09' }).ok).toBe(true);
        const late = gate({ advisories: advisoriesFrom(AUDIT), allowlist, today: '2026-10-24' });
        expect(late.ok).toBe(false);
        expect(late.expired.length).toBe(2);
    });

    it('ignores moderate advisories, and reports exceptions that are no longer needed', async () => {
        const { advisoriesFrom, gate } = await script('audit-gate.mjs');
        const allowlist = { accepted: [
            { id: 'GHSA-aaaa-aaaa-aaaa', package: 'next', reason: 'x', expires: '2026-10-23' },
            { id: 'GHSA-bbbb-bbbb-bbbb', package: 'ws', reason: 'x', expires: '2026-10-23' },
            { id: 'GHSA-zzzz-zzzz-zzzz', package: 'gone', reason: 'fixed already', expires: '2026-10-23' },
        ] };
        const r = gate({ advisories: advisoriesFrom(AUDIT), allowlist, today: '2026-10-09' });
        expect(r.ok).toBe(true);
        expect(r.stale.map((e: { id: string }) => e.id)).toEqual(['GHSA-zzzz-zzzz-zzzz']);
    });

    it('ships a reviewed exceptions file where every entry has a reason and a deadline', () => {
        const allowlist = JSON.parse(read('.github/audit-allowlist.json') || '{}');
        expect(Array.isArray(allowlist.accepted)).toBe(true);
        for (const e of allowlist.accepted) {
            expect(e.id).toMatch(/^GHSA-[\w-]+$/);
            expect(e.reason).toMatch(/\S/);
            expect(e.expires).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC7 — the repository rules, as files you import, not clicks to remember
// ─────────────────────────────────────────────────────────────────────────────

describe('AC7: repository policy', () => {
    const ruleset = () => JSON.parse(read('.github/rulesets/master.json') || '{}');
    const rule = (type: string) => (ruleset().rules ?? []).find((r: { type: string }) => r.type === type);

    it('protects the default branch, actively enforced', () => {
        expect(ruleset()).toMatchObject({ target: 'branch', enforcement: 'active' });
        expect(ruleset().conditions.ref_name.include).toEqual(['~DEFAULT_BRANCH']);
    });

    it('requires a pull request with an approving review from a code owner', () => {
        expect(rule('pull_request').parameters).toMatchObject({
            required_approving_review_count: 1,
            require_code_owner_review: true,
            dismiss_stale_reviews_on_push: true,
            required_review_thread_resolution: true,
        });
    });

    it('requires verify and audit to pass on an up-to-date branch, reported by GitHub Actions', () => {
        const p = rule('required_status_checks').parameters;
        expect(p.strict_required_status_checks_policy).toBe(true);
        expect(p.required_status_checks.map((c: { context: string }) => c.context).sort()).toEqual(['audit', 'verify']);
        for (const c of p.required_status_checks) expect(c.integration_id).toBe(15368);
    });

    it('blocks force pushes and deleting master', () => {
        expect(rule('non_fast_forward')).toBeDefined();
        expect(rule('deletion')).toBeDefined();
    });

    it('lets the repository admin merge their own pull request — never push straight to master', () => {
        expect(ruleset().bypass_actors).toEqual([{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' }]);
    });

    it('names a code owner for money, auth, data, flags, middleware, hosting and the pipeline itself', () => {
        const owners = read('.github/CODEOWNERS');
        for (const path of [
            '/apps/web/src/lib/payments/',
            '/apps/web/src/lib/auth/',
            '/apps/web/supabase/migrations/',
            '/apps/web/src/lib/platform/productFlags.ts',
            '/apps/web/src/middleware.ts',
            '/apps/web/.do/',
            '/.github/',
        ]) expect(owners, path).toMatch(new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\s+@\\S+`, 'm'));
    });

    it('deploys from the one canonical repository, voicesitecompany-2428/voicesite.in', () => {
        const repos = [...read('apps/web/.do/app.yaml').matchAll(/^\s+repo:\s*(\S+)/gm)].map((m) => m[1]);
        expect(repos.length).toBeGreaterThanOrEqual(2); // the service and the job
        for (const repo of repos) expect(repo).toBe('voicesitecompany-2428/voicesite.in');
    });

    it('names the canonical repository\'s owner as the code owner on every line', () => {
        const owners = read('.github/CODEOWNERS').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
            .flatMap((l) => l.trim().split(/\s+/).slice(1));
        expect(owners.length).toBeGreaterThan(0);
        for (const owner of owners) expect(owner).toBe('@voicesitecompany-2428');
    });

    it('sets up the canonical repository, retires the old one, and moves DigitalOcean only after the code is there', () => {
        const doc = read('docs/ci-cd.md');
        expect(doc).toMatch(/`voicesitecompany-2428\/voicesite\.in` → \*\*Settings\*\* → \*\*Environments\*\*/);
        expect(doc).toMatch(/Archive `daffodilirenesstudent-dot\/vsite\.in`/);
        // Switching DigitalOcean's source rebuilds from the new repo's master at once:
        // the code has to be there first, or months-old code goes live.
        const push = doc.indexOf('git push origin 8a3fbc2');
        const relink = doc.indexOf('**Source**: change the repository');
        expect(push).toBeGreaterThan(-1);
        expect(relink).toBeGreaterThan(push);
    });

    it('documents the one-time setup only the owner can do', () => {
        const doc = read('docs/ci-cd.md');
        for (const step of ['production', 'DIGITALOCEAN_ACCESS_TOKEN', 'DO_APP_ID', 'master.json', 'Autodeploy', 'COMMIT_SHA', 'Health check']) {
            expect(doc, step).toContain(step);
        }
    });
});
