#!/usr/bin/env node
// do-deploy.mjs — deploys vsite to DigitalOcean App Platform, proves which
// commit went live, and rolls back. Run by .github/workflows/deploy.yml after CI
// passed and the owner approved. Runbook: docs/ci-cd.md
//
//   node .github/scripts/do-deploy.mjs deploy   --app <app-id> --commit <sha> [--service <name>]
//   node .github/scripts/do-deploy.mjs rollback --app <app-id> --to <deployment-id>
//
// Env:  DIGITALOCEAN_ACCESS_TOKEN  a token scoped to App Platform (app:read, app:update)
//       DIGITALOCEAN_API_BASE      overrides https://api.digitalocean.com/v2 (local tests only)
//
// Why not `doctl apps create-deployment --wait`: the pipeline needs three facts
// doctl does not report — which deployment was live before (the rollback
// target), whether the new one reached ACTIVE, and which commit DigitalOcean
// actually built. With Autodeploy off, DigitalOcean builds the branch head when
// a deployment is created; this script checks that head is the approved commit.
//
// The Actions log of a public repository is public. Only deployment IDs, phases
// and commit hashes are printed — never the app spec, env values or log URLs.
//
// No dependencies (Node 20+). Exit 0 = done, 1 = failed.

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gitIsAncestor, sameCommit, short } from './lib/commits.mjs';

export const TERMINAL_PHASES = new Set(['ACTIVE', 'ERROR', 'CANCELED', 'SUPERSEDED']);
const POLL_MS = 10_000;
const TIMEOUT_MS = 25 * 60_000;

const say = (line) => process.stdout.write(`${line}\n`);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A failed deploy. `deployed` says whether a new version went live (and so needs rolling back). */
export class DeployError extends Error {
    constructor(message, { deployed = false, result = null } = {}) {
        super(message);
        this.name = 'DeployError';
        this.deployed = deployed;
        this.result = result;
    }
}

/** The four App Platform endpoints the pipeline uses. */
export function createApi({ token, fetchImpl = fetch, base = 'https://api.digitalocean.com/v2' }) {
    async function call(method, path, body) {
        const res = await fetchImpl(`${base}${path}`, {
            method,
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(30_000),
        });
        const text = await res.text();
        if (!res.ok) {
            let message = text.slice(0, 200);
            try { message = JSON.parse(text).message ?? message; } catch { /* not JSON */ }
            throw new Error(`DigitalOcean API ${method} ${path} → ${res.status}: ${message}`);
        }
        return text ? JSON.parse(text) : {};
    }
    return {
        getApp: async (appId) => (await call('GET', `/apps/${appId}`)).app,
        createDeployment: async (appId) => (await call('POST', `/apps/${appId}/deployments`, { force_build: false })).deployment,
        getDeployment: async (appId, id) => (await call('GET', `/apps/${appId}/deployments/${id}`)).deployment,
        // skip_pin: an unpinned rollback is committed at once, so the next
        // fixed release can deploy without anyone unpinning the app first.
        rollback: async (appId, deploymentId) =>
            (await call('POST', `/apps/${appId}/rollback`, { deployment_id: deploymentId, skip_pin: true })).deployment,
    };
}

/** The commit DigitalOcean built for the app's service. */
export function deployedCommitOf(deployment, service) {
    const services = deployment?.services ?? [];
    const pick = service
        ? services.find((s) => s.name === service)
        : services.length === 1 ? services[0] : services.find((s) => s.source_commit_hash);
    return pick?.source_commit_hash ?? null;
}

/** Polls a deployment until it reaches a terminal phase, logging each phase change. */
export async function waitForDeployment({
    api, appId, deploymentId,
    pollMs = POLL_MS, timeoutMs = TIMEOUT_MS, sleep = pause, now = Date.now, log = say,
}) {
    const started = now();
    let last = '';
    for (;;) {
        const d = await api.getDeployment(appId, deploymentId);
        const phase = d?.phase ?? 'UNKNOWN';
        if (phase !== last) {
            const p = d?.progress;
            log(`  ${deploymentId} → ${phase}${p?.total_steps ? ` (${p.success_steps ?? 0}/${p.total_steps} steps)` : ''}`);
            last = phase;
        }
        if (TERMINAL_PHASES.has(phase)) return d;
        if (now() - started > timeoutMs) {
            throw new DeployError(
                `Deployment ${deploymentId} did not finish within ${Math.round(timeoutMs / 60_000)} min (last phase ${phase}). `
                + 'Check it in the DigitalOcean console.',
            );
        }
        await sleep(pollMs);
    }
}

/**
 * Deploys the branch head and proves it is the approved commit.
 * Throws DeployError; `deployed: true` means a wrong or failing version is live
 * and the caller must roll back to `result.previousDeploymentId`.
 */
export async function deploy({ api, appId, commit, service, isAncestor, log = say, notice = say, ...timing }) {
    let app = await api.getApp(appId);
    if (app?.in_progress_deployment?.id) {
        // Someone pressed Deploy in the console. Let it finish, so the rollback
        // target recorded below is the version that is really serving.
        log(`A deployment is already in progress (${app.in_progress_deployment.id}); waiting for it first.`);
        await waitForDeployment({ api, appId, deploymentId: app.in_progress_deployment.id, log, ...timing });
        app = await api.getApp(appId);
    }
    const previousDeploymentId = app?.active_deployment?.id ?? null;

    const started = await api.createDeployment(appId);
    log(`Deploying ${short(commit)}: deployment ${started.id} (live before: ${previousDeploymentId ?? 'none'})`);
    const final = await waitForDeployment({ api, appId, deploymentId: started.id, log, ...timing });

    const result = {
        previousDeploymentId,
        deploymentId: started.id,
        phase: final.phase,
        deployedCommit: deployedCommitOf(final, service),
    };
    if (final.phase !== 'ACTIVE') {
        throw new DeployError(`Deployment ${started.id} ended in ${final.phase}. Production still serves the previous deployment.`, { result });
    }
    if (!result.deployedCommit) {
        notice(`Deployment ${started.id} reports no source commit; the smoke test checks /api/version instead.`);
        return result;
    }
    if (sameCommit(result.deployedCommit, commit)) return result;

    const contained = await isAncestor(commit, result.deployedCommit);
    if (contained === true) {
        notice(`A newer commit (${short(result.deployedCommit)}) is live and contains ${short(commit)}; its own run verifies it.`);
        return result;
    }
    if (contained === null) {
        notice(`DigitalOcean built ${short(result.deployedCommit)}, not ${short(commit)}, and git could not compare them; the smoke test decides.`);
        return result;
    }
    throw new DeployError(`DigitalOcean deployed ${short(result.deployedCommit)}, not the approved ${short(commit)}.`, { deployed: true, result });
}

/** Rolls back to a recorded deployment and waits until it is live again. */
export async function rollback({ api, appId, toDeploymentId, log = say, ...timing }) {
    const started = await api.rollback(appId, toDeploymentId);
    log(`Rolling back to ${toDeploymentId}: deployment ${started.id}`);
    const final = await waitForDeployment({ api, appId, deploymentId: started.id, log, ...timing });
    if (final.phase !== 'ACTIVE') {
        throw new DeployError(`Rollback deployment ${started.id} ended in ${final.phase}. Roll back by hand: DigitalOcean console → the app → Activity.`);
    }
    return { deploymentId: started.id, phase: final.phase, deployedCommit: deployedCommitOf(final) };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{7,40}$/i;

function args(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i += 2) {
        if (!argv[i]?.startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
        out[argv[i].slice(2)] = argv[i + 1];
    }
    return out;
}

function output(values) {
    if (!process.env.GITHUB_OUTPUT) return;
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${v ?? ''}\n`).join(''));
}

function summary(lines) {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n\n`);
}

const annotate = (level, title, message) => say(`::${level} title=${title}::${message}`);

async function main(argv) {
    const [command, ...rest] = argv;
    const opts = args(rest);
    const token = process.env.DIGITALOCEAN_ACCESS_TOKEN;
    if (!token) throw new Error('DIGITALOCEAN_ACCESS_TOKEN is not set: add it as a secret of the production environment (docs/ci-cd.md, step 3).');
    if (!UUID.test(opts.app ?? '')) throw new Error('--app must be the app ID: set the DO_APP_ID variable of the production environment (docs/ci-cd.md, step 3).');
    const api = createApi({ token, base: process.env.DIGITALOCEAN_API_BASE || undefined });
    const notice = (m) => annotate('notice', 'Deploy', m);

    if (command === 'deploy') {
        if (!SHA.test(opts.commit ?? '')) throw new Error('--commit must be a git commit SHA.');
        try {
            const r = await deploy({ api, appId: opts.app, commit: opts.commit, service: opts.service, isAncestor: gitIsAncestor, notice });
            output({ deployed: 'true', previous_deployment_id: r.previousDeploymentId, deployment_id: r.deploymentId, deployed_commit: r.deployedCommit });
            summary([
                '### Deploy to DigitalOcean',
                '| | |', '|---|---|',
                `| Approved commit | \`${short(opts.commit)}\` |`,
                `| Live before (rollback target) | \`${r.previousDeploymentId ?? 'none'}\` |`,
                `| New deployment | \`${r.deploymentId}\` → ${r.phase} |`,
                `| Commit DigitalOcean built | \`${short(r.deployedCommit)}\` |`,
            ]);
            say(`Live: ${short(r.deployedCommit)} (deployment ${r.deploymentId})`);
        } catch (err) {
            const r = err?.result ?? {};
            output({ deployed: err?.deployed ? 'true' : 'false', previous_deployment_id: r.previousDeploymentId, deployment_id: r.deploymentId, deployed_commit: r.deployedCommit });
            throw err;
        }
    } else if (command === 'rollback') {
        if (!UUID.test(opts.to ?? '')) throw new Error('--to must be a deployment ID.');
        const r = await rollback({ api, appId: opts.app, toDeploymentId: opts.to });
        annotate('warning', 'Rolled back', `Production is back on deployment ${opts.to} (commit ${short(r.deployedCommit)}). The release that failed is not live.`);
        summary(['### Rolled back', `Production is back on deployment \`${opts.to}\` (commit \`${short(r.deployedCommit)}\`).`]);
    } else {
        throw new Error('Usage: do-deploy.mjs deploy --app <id> --commit <sha> | rollback --app <id> --to <deployment-id>');
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main(process.argv.slice(2)).catch((err) => {
        annotate('error', 'Deploy failed', err?.message ?? String(err));
        process.exitCode = 1;
    });
}
