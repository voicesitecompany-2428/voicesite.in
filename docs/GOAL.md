# Current Goal

Feature: **CI/CD Phase 1** (`ci-cd-pipeline`, owner request 2026-10-09: "start building it…
industry-standardized methods… production-ready"). Measured before: CI failed 17/17 runs and gated
nothing; DigitalOcean deployed every push to master; master unprotected; `npm audit` never ran.

The rule: a change reaches vsite.in only through a pull request that passes `verify` + `audit` and
a code owner's review; each master commit is re-checked, approved by the owner, deployed through the
DigitalOcean API with commit verification, smoke-tested, and rolled back automatically on failure.
GitHub/DigitalOcean settings are the owner's steps (`docs/ci-cd.md`); everything else is in the repo.

## Acceptance criteria (`apps/web/tests/acceptance/ci-cd-pipeline.test.ts`)

- [ ] **AC1**: CI is the PR gate — `verify` (tsc, lint, tests minus the runner-impossible claude-hooks) and `audit`; Node from `engines`.
- [ ] **AC2**: every workflow hardened — SHA-pinned actions, read-only token, timeouts, no `${{ }}` in scripts, no persisted credentials.
- [ ] **AC3**: deploy workflow — CI on the exact commit, `production` approval, one deploy at a time, token scoped to two steps, rollback on failure; Autodeploy off + health check in the spec.
- [ ] **AC4**: `do-deploy.mjs` — rollback target recorded, ACTIVE awaited, built commit verified, unpinned rollback, safe error messages.
- [ ] **AC5**: `post-deploy-smoke.mjs` — pages, sign-in walls, frozen ordering, served commit; retries.
- [ ] **AC6**: `audit-gate.mjs` — new high/critical blocks; reviewed entries pass until their deadline.
- [ ] **AC7**: ruleset + CODEOWNERS + runbook.

Previous goals: Data hygiene before launch (`data-hygiene`), One free trial per account (`one-trial`).

## Previous: Data hygiene before launch

Feature: **Data hygiene before launch** (`data-hygiene`, owner request 2026-10-09: "fix this for
production level code"). Four items from the go-live review:

1. "Total Visitors" reads every scan row on each 30 s poll and undercounts past 1,000 rows →
   count in the database (migration 066, expand-only), route falls back until it is applied.
2. Veg dishes showing meat photos (89 live, measured 2026-10-09) → the dish's own veg/egg/non-veg
   marking gates every library-photo pick (onboarding, bulk upload, the dish drawer), and a
   dry-run-first repair script fixes the existing ones.
3. 155 unused photos in storage → a dry-run-first sweep that deletes only a reviewed list.
4. Thumbnails cut at 360 px → an upgrade script recuts them at 450 px; originals untouched.

Nothing writes to production by itself: every data change is a script, dry run by default, run by
the owner.

## Acceptance criteria (`apps/web/tests/acceptance/data-hygiene.test.ts`)

- [ ] **AC1**: migration 066 `menu_scan_counts` — distinct counts, stable, pinned search_path,
      service_role only, expand-only.
- [ ] **AC2**: the summary route uses it, reads no scan rows, falls back before 066 exists.
- [ ] **AC3**: the matcher's `diet` option: veg dish → veg photos only; egg → no meat; no option →
      unchanged.
- [ ] **AC4**: `libraryPhoto.ts` maps food_type/dish_type to a diet and picks a URL.
- [ ] **AC5**: bulk upload, onboarding, `/api/images/match` and the dish drawer pass the marking;
      bulk upload no longer calls OpenAI embeddings or the vector RPC.
- [ ] **AC6**: the repair plan changes only photos that show more meat than the dish has.
- [ ] **AC7**: unused photos are found safely (grace period, encoded URLs, metadata, no empty refs).
- [ ] **AC8**: thumbnails below 450 px are recut; originals never written or removed.

Previous goals: One free trial per account (`one-trial`), You tab redesign, Mobile nav v2.

## Previous: One free trial per account

Feature: **One free trial per account** (`one-trial`) — the owner's hybrid plan, decided
2026-09-25 after the trial-abuse research. Before launch; existing users are beta and need no
special handling (owner).

The rule:
- An account (one phone number — Firebase phone auth, no account deletion exists) can have at
  most **2 stores**.
- The **first** store gets the 7-day free trial. The trial is used **once per account, for good**:
  deleting a store and creating another does not bring it back.
- A store created after the trial is used has **no trial**. The owner can build it, but it stays
  offline until paid (₹299, today's per-store payment flow, unchanged). Before creating it the
  owner sees their phone number, is told the trial is used and the store goes live only after
  paying, and must tick an agreement — "with full intention only".
- The database enforces it (owners can insert/update `sites` from the browser, so the rule cannot
  live only in the API). The trial window moves from `sites.created_at + 7 days` — which owners can
  rewrite from the browser today — to `site_subscriptions.trial_ends_at`, which they cannot.

Migrations: `058` expand-only (trial date, trial claims, consent column, backfill, a trigger that
opens each new store's subscription row with its trial decided); `059` tightens the store-limit
trigger (2 stores, consent required). Apply 058 → deploy → 059. Not applied until the owner says go.

Previous goals: You tab redesign (`you-tab`), Mobile nav v2 (`mobile-nav`), Food posters.

Token per Ralph loop: 3 iterations

## Acceptance criteria (each maps to a test in `apps/web/tests/acceptance/one-trial.test.ts`)

- [ ] **AC1**: one pure rule decides store creation — 2-store limit, trial only if unused, consent
      required otherwise.
- [ ] **AC2**: migration 058 is expand-only and backfills so every existing store keeps its current
      trial state; new stores get their trial decided by the database, once per account.
- [ ] **AC3**: migration 059 enforces the 2-store limit and the consent in the database, race-safe.
- [ ] **AC4**: every trial gate (public menu, go-live toggle, plan context, plan status, AI
      allowance, eligibility) reads `trial_ends_at`; none derives the trial from `created_at`.
- [ ] **AC5**: the server asks before spending: extract and launch refuse a no-trial store without
      the owner's consent; launch reports whether the store is live; an eligibility route tells
      the app where the account stands.
- [ ] **AC6**: the consent screen shows the phone number, says the trial is used and the store
      goes live only after paying ₹299, and cannot continue until the owner agrees.
- [ ] **AC7**: onboarding and the You tab show that screen before a no-trial store is built; the
      launch screen says "pay to go live", never "is live", for such a store.
- [ ] **AC8**: a no-trial store is never told its trial ended — it is "not live yet, pay to go live".

## Previous: You tab redesign

Feature: **You tab redesign** (`you-tab`) — the phone "You" tab and every screen behind it,
rebuilt phone-first. Owner-approved 2026-09-25 on the design canvas
(https://claude.ai/artifact/JH435VTbKGwj3dDP9M1xSy): approach A (own pages under
`/manage/you/…`), store card with plan status on top, sign-out as a quiet link at the very
bottom, add-store pre-screen before the existing wizard, and the payment flow unchanged —
"only change the UI design".

Screens: You · Store details · Menu design · Banners (+ add/edit) · Plan & bills (+ pay sheet) ·
Add a store (+ at-limit) · Help & support (placeholder) · Sign-out sheet.

Constraints: behind `NEXT_PUBLIC_MOBILE_NAV_V2` (the You tab only exists with it). Phones get the
new pages; desktop keeps today's settings / banners / subscription pages. Same backend as today —
no schema change, no new route, no new dependency. The ₹299 checkout (create-subscription →
Razorpay → verify-payment → poll) moves verbatim into one hook shared by the old and new plan
screens; its rules stay (no payment while a trial or plan is running). Only ₹299 is ever shown.

Previous goals: Mobile nav v2 (`mobile-nav`, same branch — its AC6 is superseded by AC6 below),
Food posters, QR print kit.


## Acceptance criteria (each maps to a test in `apps/web/tests/acceptance/you-tab.test.ts`)

- [ ] **AC1**: plan status is one pure rule — trial / active / ending soon / trial ended / expired,
      days left, progress; payment offered only when no trial and no plan is running; ₹ from
      `PLAN_PRICES_INR`.
- [ ] **AC2**: store details — the first missing detail becomes the You-page nudge; name required,
      PIN validated; the save writes the same `sites` columns as settings; hours only overwritten
      when picked.
- [ ] **AC3**: banners — move up/down reorders and renumbers, no-op at the ends; the preview crop is
      the customer menu's 351:134; the summary line says how many are showing.
- [ ] **AC4**: add a store — limit-aware pre-screen into the existing wizard; at the trial limit it
      says when a spot opens; at 5 it offers WhatsApp.
- [ ] **AC5**: help — WhatsApp link pre-filled with the store; email; owner FAQs only; a "coming
      soon" request card.
- [ ] **AC6**: the You page — store card with plan status, rows with live subtitles linking to the
      six new screens, sign-out last, behind "Sign out of vsite?" / "Stay signed in".
- [ ] **AC7**: sub-pages are full-screen on phones (no header, notices or bottom bar) and still
      light the You tab.
- [ ] **AC8**: one copy of the checkout, used by the old and the new plan screen; the new screen
      never quotes another plan and uses the canonical "coming soon" copy.
- [ ] **AC9**: motion is subtle and switches off under reduced motion.
- [ ] **AC10**: one delete-store implementation, behind typing the store name.
- [ ] **AC11**: flag off, nothing changes: the shell and nav behave as today.
