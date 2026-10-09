#!/usr/bin/env node
// audit-gate.mjs — the `audit` required check (.github/workflows/ci.yml).
//
// Blocks a pull request when a production dependency has a high or critical
// advisory that nobody has reviewed, or whose review has expired. Reviewed
// advisories live in .github/audit-allowlist.json, each with a reason and an
// expiry date: an entry past its date blocks again, so an accepted risk is
// revisited instead of forgotten. Runbook: docs/ci-cd.md, "Security audit".
//
//   node .github/scripts/audit-gate.mjs [--today YYYY-MM-DD]
//
// Dev-only packages (test runners, linters, build tools) are counted but not
// gated: they never ship to vsite.in. Moderate and low advisories are counted;
// Dependabot raises PRs for them.
//
// Reads the lockfile only; nothing is installed. No dependencies (Node 20+).
// Exit 0 = pass, 1 = blocking advisories, 2 = the audit itself could not run.

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = join(ROOT, 'apps', 'web');
const ALLOWLIST = join(ROOT, '.github', 'audit-allowlist.json');
export const BLOCKING_SEVERITIES = ['high', 'critical'];

/** Each advisory once, keyed by its GitHub advisory ID, from `npm audit --json` (npm 7+). */
export function advisoriesFrom(audit) {
    const out = new Map();
    for (const vuln of Object.values(audit?.vulnerabilities ?? {})) {
        for (const via of vuln.via ?? []) {
            if (typeof via !== 'object' || via === null) continue; // a package name: the advisory is listed under it
            const id = String(via.url ?? '').match(/GHSA-[\w-]+/)?.[0] ?? `npm-${via.source}`;
            if (!out.has(id)) {
                out.set(id, { id, package: via.name ?? via.dependency, severity: via.severity, title: via.title, url: via.url, range: via.range });
            }
        }
    }
    return [...out.values()];
}

/** Splits advisories into blocking, accepted (reviewed, in date) and expired; lists exceptions no longer needed. */
export function gate({ advisories, allowlist, today, blockOn = BLOCKING_SEVERITIES }) {
    const reviewed = new Map((allowlist?.accepted ?? []).map((e) => [e.id, e]));
    const blocking = [];
    const accepted = [];
    const expired = [];
    for (const a of advisories.filter((x) => blockOn.includes(x.severity))) {
        const entry = reviewed.get(a.id);
        if (!entry) blocking.push(a);
        else if (String(entry.expires) < today) expired.push({ ...a, expires: entry.expires, reason: entry.reason });
        else accepted.push({ ...a, expires: entry.expires, reason: entry.reason });
    }
    const current = new Set(advisories.map((a) => a.id));
    const stale = [...reviewed.values()].filter((e) => !current.has(e.id));
    return { ok: blocking.length === 0 && expired.length === 0, blocking, accepted, expired, stale };
}

function npmAudit(extra) {
    const run = spawnSync('npm', ['audit', '--json', ...extra], {
        cwd: APP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32',
    });
    let json;
    try { json = JSON.parse(run.stdout); } catch { throw new Error(`npm audit printed no JSON (exit ${run.status}): ${String(run.stderr).slice(0, 300)}`); }
    if (json.error) throw new Error(`npm audit failed: ${json.error.summary ?? json.error.code}`);
    return json;
}

function main(argv) {
    const i = argv.indexOf('--today');
    const today = i >= 0 ? argv[i + 1] : new Date().toISOString().slice(0, 10);
    const say = (line) => process.stdout.write(`${line}\n`);

    let prod;
    let all;
    try {
        prod = npmAudit(['--omit=dev']);
        all = npmAudit([]);
    } catch (err) {
        say(`::error title=Audit could not run::${err.message} Re-run the job; if npm's registry is down, it passes once it is back.`);
        return 2;
    }
    const allowlist = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
    const r = gate({ advisories: advisoriesFrom(prod), allowlist, today });
    const prodCounts = prod.metadata?.vulnerabilities ?? {};
    const allCounts = all.metadata?.vulnerabilities ?? {};
    const devOnly = Math.max(0, (allCounts.total ?? 0) - (prodCounts.total ?? 0));

    say(`Production dependencies, ${today}: ${prodCounts.critical ?? 0} critical, ${prodCounts.high ?? 0} high, ${prodCounts.moderate ?? 0} moderate, ${prodCounts.low ?? 0} low.`);
    say(`  blocking ${r.blocking.length} · reviewed and in date ${r.accepted.length} · review expired ${r.expired.length}`);
    say(`Dev-only advisories (not shipped, not gated): ${devOnly}.`);
    for (const a of r.blocking) say(`::error title=New ${a.severity} advisory in ${a.package}::${a.id} ${a.title} (${a.url}). Fix it, or review it in .github/audit-allowlist.json with a reason and a deadline.`);
    for (const a of r.expired) say(`::error title=Review expired for ${a.package}::${a.id} was accepted until ${a.expires} (${a.reason}). Fix it, or renew the review.`);
    for (const e of r.stale) say(`::notice title=Exception no longer needed::${e.id} (${e.package}) is fixed; remove it from .github/audit-allowlist.json.`);
    for (const a of r.accepted) say(`  accepted until ${a.expires}: ${a.severity} ${a.package} ${a.id}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
            `### Security audit — ${r.ok ? 'passed' : 'BLOCKED'}`, '',
            `Production dependencies: ${prodCounts.critical ?? 0} critical, ${prodCounts.high ?? 0} high. Dev-only (not gated): ${devOnly}.`, '',
            '| Advisory | Package | Severity | Status |', '|---|---|---|---|',
            ...r.blocking.map((a) => `| [${a.id}](${a.url}) | ${a.package} | ${a.severity} | ❌ not reviewed |`),
            ...r.expired.map((a) => `| [${a.id}](${a.url}) | ${a.package} | ${a.severity} | ❌ review expired ${a.expires} |`),
            ...r.accepted.map((a) => `| [${a.id}](${a.url}) | ${a.package} | ${a.severity} | ⏳ accepted until ${a.expires} |`),
            '', '',
        ].join('\n'));
    }
    say(r.ok ? 'Audit passed.' : 'Audit BLOCKED: see the errors above.');
    return r.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    process.exitCode = main(process.argv.slice(2));
}
