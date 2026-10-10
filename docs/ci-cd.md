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

The repository is `voicesitecompany-2428/voicesite.in` (git remote `origin`). Until
2026-10-09 DigitalOcean deployed from `daffodilirenesstudent-dot/vsite.in` (remote
`vsite`); steps 0, 2 and 6 move everything across. Until step 2 is done, DigitalOcean
still deploys every push to the old repository's master by itself. Do steps 0–5
before merging anything.

### 0. Put production's code on the new repository

The new repository's `master` was at `26ddd1d` (24 May), a direct ancestor of
production, so it catches up with a plain fast-forward: no force push, no history
rewritten.

```
git push origin 8a3fbc24a26a925046781a1e3fd7ce116b424f64:refs/heads/master   # production on 2026-10-09
git push origin --tags
```

Git asks you to sign in: use an account with write access to
`voicesitecompany-2428/voicesite.in`. Do this **before** step 2. Switching
DigitalOcean's source rebuilds from this `master` at once, and before this push it
held code from May.

### 1. DigitalOcean — a deploy token

DigitalOcean → **API** → **Tokens** → **Generate New Token**
- Name: `github-deploy-vsite`. Expiration: **90 days** (put the renewal date in your calendar).
- Scopes: **Custom** → **app**: `read` and `update`. Nothing else: the pipeline only
  reads the app, starts deployments and rolls back (`app:read`, `app:update`).
- Copy the token once. It becomes `DIGITALOCEAN_ACCESS_TOKEN` in step 3.

The app ID is in the address bar on the app's page:
`cloud.digitalocean.com/apps/<this-part>/...`. It becomes `DO_APP_ID` in step 3.

### 2. DigitalOcean — the app's settings

Apps → **vsite** → **Settings** → the **web** component (and any other component,
such as a job, that has a source):
1. **Source**: change the repository to `voicesitecompany-2428/voicesite.in`, branch
   `master`, source directory `apps/web`. DigitalOcean asks you to connect GitHub: sign
   in as `voicesitecompany-2428` and give the DigitalOcean app access to this
   repository. Only after step 0.
2. **Source** → untick **Autodeploy** (deploy on push). App Platform cannot wait for
   GitHub's checks; the Deploy workflow starts each deployment instead.
3. **Environment Variables** → add `COMMIT_SHA` = `${_self.COMMIT_HASH}`, scope **Run time**.
   `/api/version` then reports the serving commit (today it says `unknown`).
4. **Health check** → HTTP, path `/api/version`. A new version takes traffic only once
   it answers; otherwise the deployment fails and the old one keeps serving.

Saving redeploys the app, now built from the new repository. Open
`https://vsite.in/api/version`: it should show `8a3fbc2…`. That is the same code as
before, which proves DigitalOcean can build from the new repository.

Do not apply `apps/web/.do/app.yaml` with `doctl`: it records the intended settings
but not the app's secrets, and applying it would remove them.

### 3. GitHub — the `production` environment

`voicesitecompany-2428/voicesite.in` → **Settings** → **Environments** → **New environment** → `production`:
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

1. `.github/CODEOWNERS` names `@voicesitecompany-2428`, the repository's owner, on
   every line. To add another reviewer, give that account write access to the
   repository and add it to each line.
2. **Settings** → **Rules** → **Rulesets** → **New ruleset** → **Import a ruleset** →
   choose `.github/rulesets/master.json` → **Create**.

The ruleset protects master: pull requests only, 1 approval from a code owner,
`verify` and `audit` green on an up-to-date branch, no force pushes, no deletion.
The repository admin can merge their own pull request after the checks pass
(GitHub never lets an author approve their own PR) but cannot push to master
directly.

### 6. One repository

After step 7's first deploy is green, Archive `daffodilirenesstudent-dot/vsite.in` on
GitHub (**Settings** → **Archive**). An archived repository is read-only and runs no
workflows, so its hourly CDN probe stops and only the new repository's runs.
Locally: `git remote remove vsite`.

### 7. First run: two pull requests

1. **The pipeline on its own.** Branch `chore/ci-cd-pipeline` is production's code
   (`8a3fbc2`) plus the pipeline, and no app change. Push it, open a pull request into
   master and wait for `verify` and `audit` to go green. Merge it: as the owner of your
   own PR, tick "Merge without waiting for requirements (bypass rules)", and only when
   both checks are green. The **Deploy** workflow runs CI, then shows **Review
   deployments**: approve `production`. Watch the run: deploy → smoke test → CDN probe.
   The run summary shows the commit DigitalOcean built and every check.
2. **The release.** Branch `chore/ci-cd-phase1` carries the 2026-10-09 release
   (`docs/releases/2026-10-09.md`). Run its "Before the push" steps first, then open its
   pull request and go through the same merge → approve → watch. Its "After the deploy"
   steps follow.

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
