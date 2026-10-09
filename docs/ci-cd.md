# CI/CD — how a change reaches vsite.in

Phase 1, built 2026-10-09. Every change reaches production through one path, and
nothing can skip it:

```
feature branch ─► pull request ─► verify + audit ─► owner approval ─► merge to master
                                                                          │
master ─► CI again on that exact commit ─► owner approves the deploy ─► DigitalOcean deploy
      ─► "is it the approved commit?" ─► smoke test ─► CDN probe ─► done
                         └──────────── any failure after going live ──► automatic rollback
```

| Stage | What runs | What it stops |
|---|---|---|
| Pull request → `verify` | typecheck, lint, ~2,200 tests (payments, ordering freeze, DB policy…) | code that breaks a test |
| Pull request → `audit` | `npm audit` of production dependencies against `.github/audit-allowlist.json` | a new high/critical advisory, or an accepted one past its deadline |
| Pull request → review | the ruleset: 1 approval from a code owner, conversations resolved, branch up to date | unreviewed changes, direct pushes, force pushes |
| Deploy → CI | the same two checks on the merge commit | a bad merge of two good branches |
| Deploy → approval | the `production` environment's required reviewer | deploying without the owner saying go |
| Deploy → DigitalOcean | `do-deploy.mjs deploy` waits for ACTIVE and checks the built commit | a failed build (prod keeps the old version) or the wrong commit live |
| Deploy → smoke | `post-deploy-smoke.mjs`: pages, sign-in walls, frozen ordering, served commit | a release that is up but broken |
| Deploy → CDN probe | `edge-cache-guard.mjs --full`: every sitemap page | a return of the 2026-10-03 cache poisoning |
| Rollback | `do-deploy.mjs rollback` to the deployment that was live before | a bad release staying live |

Files: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`,
`.github/workflows/edge-cache-guard.yml`, `.github/scripts/`,
`.github/rulesets/master.json`, `.github/CODEOWNERS`,
`.github/audit-allowlist.json`. Contract: `apps/web/tests/acceptance/ci-cd-pipeline.test.ts`.

---

## One-time setup (owner, in this order)

Until step 2 is done, DigitalOcean still deploys every push to master by itself.
Do steps 1–4 before merging anything into master.

### 1. DigitalOcean — a deploy token

DigitalOcean → **API** → **Tokens** → **Generate New Token**
- Name: `github-deploy-vsite`. Expiration: **90 days** (put the renewal date in your calendar).
- Scopes: **Custom** → **app**: `read` and `update`. Nothing else: the pipeline only
  reads the app, starts deployments and rolls back (`app:read`, `app:update`).
- Copy the token once. It becomes `DIGITALOCEAN_ACCESS_TOKEN` in step 3.

The app ID is in the address bar on the app's page:
`cloud.digitalocean.com/apps/<this-part>/...`. It becomes `DO_APP_ID` in step 3.

### 2. DigitalOcean — the app's settings

Apps → **vsite** → **Settings** → the **web** component:
1. **Source** → untick **Autodeploy** (deploy on push). App Platform cannot wait for
   GitHub's checks; the Deploy workflow starts each deployment instead.
2. **Environment Variables** → add `COMMIT_SHA` = `${_self.COMMIT_HASH}`, scope **Run time**.
   `/api/version` then reports the serving commit (today it says `unknown`).
3. **Health check** → HTTP, path `/api/version`. A new version takes traffic only once
   it answers; otherwise the deployment fails and the old one keeps serving.

Do not apply `apps/web/.do/app.yaml` with `doctl`: it records the intended settings
but not the app's secrets, and applying it would remove them.

### 3. GitHub — the `production` environment

`daffodilirenesstudent-dot/vsite.in` → **Settings** → **Environments** → **New environment** → `production`:
- **Required reviewers**: your account. Leave "Prevent self-review" off (you approve your own releases).
- **Deployment branches and tags**: **Selected branches** → `master`.
- **Environment secrets** → `DIGITALOCEAN_ACCESS_TOKEN` = the token from step 1.
- **Environment variables** → `DO_APP_ID` = the app ID from step 1.

Environment secrets are released only to a job that passed the approval, so no pull
request, fork or other workflow can read the token.

### 4. GitHub — Actions settings

**Settings** → **Actions** → **General**:
- "Approval for running fork pull request workflows from contributors": **Require approval for all external contributors**.
- "Workflow permissions": **Read repository contents and packages permissions** (the default).

### 5. GitHub — code owner and the `master` ruleset

1. Open `.github/CODEOWNERS`. Every line names `@daffodilirenesstudent-dot`, the
   repository's owner. If you review with another account (commits are linked to
   `GOWTHAM0628`), it needs write access to the repository; add it to each line.
2. **Settings** → **Rules** → **Rulesets** → **New ruleset** → **Import a ruleset** →
   choose `.github/rulesets/master.json` → **Create**.

The ruleset protects master: pull requests only, 1 approval from a code owner,
`verify` and `audit` green on an up-to-date branch, no force pushes, no deletion.
The repository admin can merge their own pull request after the checks pass
(GitHub never lets an author approve their own PR) but cannot push to master
directly.

### 6. One repository

DigitalOcean deploys from `daffodilirenesstudent-dot/vsite.in`. The other remote,
`voicesitecompany-2428/voicesite.in` (`origin` locally), was 213 commits behind on
2026-10-09 and runs no CI. Archive it on GitHub (**Settings** → **Archive**), then
locally: `git remote remove origin && git remote rename vsite origin`.

### 7. First run

1. Push the branch and open a pull request into master. `verify` and `audit` run;
   both should be green.
2. Merge it. The **Deploy** workflow runs CI, then shows **Review deployments**:
   approve `production`.
3. Watch the run: deploy → smoke test → CDN probe. The run summary shows the commit
   DigitalOcean built and the result of every check.

Optional, free on public repositories: **Settings** → **Code security** → secret
scanning push protection, and CodeQL **default setup**.

---

## Everyday release

1. Branch, commit, push, open a pull request into master.
2. Wait for `verify` and `audit` (about 2 minutes). Fix anything red.
3. Merge. For your own PR, merge with the admin bypass once checks pass; anyone
   else's PR needs your approval.
4. Approve `production` when the Deploy workflow asks. Done when the run is green.

Only commits on master deploy. Re-deploying master by hand: **Actions** →
**Deploy** → **Run workflow** (still runs CI and still needs approval).

## When something fails

| What you see | What it means | What to do |
|---|---|---|
| `verify` red on a PR | a typecheck, lint or test failure | open the job, fix the code (never the test) |
| `audit` red: "New high advisory" | a dependency gained an unreviewed advisory | upgrade it, or add a reviewed entry (below) |
| `audit` red: "Review expired" | an accepted advisory passed its deadline | fix it, or renew the entry with a new reason and date |
| Deploy: "ended in ERROR" | the DigitalOcean build or start failed | nothing is live from it; read the build log in the DO console |
| Deploy: "not the approved commit" | DigitalOcean built a different commit | rolled back automatically; check who changed master or the app's branch |
| Smoke test failed | the new version is up but a check failed | rolled back automatically; the summary names the check |
| "Rolled back" warning | production is on the previous deployment | fix forward with a new PR; nothing to unpin |
| Rollback failed | DigitalOcean could not restore the old version | DO console → app → **Activity** → the previous deployment → **Rollback** |
| "did not finish within 25 min" | a deployment hung | check the DO console; the old version keeps serving until it finishes |

## Rollback and break-glass

- **Automatic:** any failure after a new version went live rolls back to the
  deployment that was live before (unpinned, so the next release deploys normally).
- **By hand:** DO console → app → **Activity** → a previous deployment → **Rollback**.
- **GitHub down:** DO console → **Actions** → **Deploy** still deploys master. Use it
  only in an emergency: it skips every check.

## Security audit

`audit` checks production dependencies only; dev tools never ship to vsite.in.
High and critical advisories block unless `.github/audit-allowlist.json` has an
entry for that advisory ID with a reason and an `expires` date. An entry past its
date blocks again. When an advisory is fixed, the job lists the entry as no longer
needed: delete it.

At the first run (2026-10-09) production had 53 such advisories across 13 packages,
all pre-existing and never reported because CI never reached the audit step:
- 41 are fixed by `npm audit fix` (lockfile only). Accepted until **2026-10-23**: make
  that the first pull request through this pipeline.
- 12 are in Next.js 14.2.35 and its bundled PostCSS; the fix is Next.js 15.5.10 or
  later, a major upgrade. Accepted until **2026-11-09**, pending your decision.

## Token rotation

Every 90 days: generate a new token (step 1), replace `DIGITALOCEAN_ACCESS_TOKEN`
in the `production` environment, delete the old token in DigitalOcean.

## What Phase 1 does not do yet (Phase 2)

- No production build or browser tests in CI: both need a staging Supabase project.
- Migrations are still applied by hand in the Supabase SQL editor.
- No staging app, no off-site database backup.
