// scripts/backfill-profile-phones.mjs
// Fills profiles.phone_number for owners whose phone was lost by the signup
// redirect race, from a Firebase Auth export — Firebase holds the number each
// owner proved with OTP. Also creates the profile row for owners who own a
// store but have none.
//
// Why it matters: /login's account check (LOGIN_REQUIRES_ACCOUNT in
// src/lib/auth/authFlags.ts) reads profiles.phone_number. On 2026-10-05, 25
// owners with stores had no phone there and 2 had no profile. Turning the flag
// on before this runs would tell them "No vsite account".
//
// Safe by construction: dry run unless --apply; only fills a NULL phone (the
// UPDATE carries `phone_number IS NULL`); never overwrites; creates a profile
// only where none exists (ignoreDuplicates). Prints numbers masked.
//
// Run:
//   1. firebase auth:export firebase-users.json --format=json --project <project-id>
//   2. SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-profile-phones.mjs firebase-users.json
//   3. Check the report, then add --apply.
//   4. Delete firebase-users.json — it holds every owner's phone.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const EXPORT = process.argv.slice(2).find(a => !a.startsWith('--'));
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://wdnruubljlwrduxnvuhr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!EXPORT) {
  console.error('Usage: node scripts/backfill-profile-phones.mjs <firebase-users.json> [--apply]');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running');
  process.exit(1);
}

const mask = (p) => (p ? `${p.slice(0, 5)}•••••${p.slice(-2)}` : '—');
const E164 = /^\+[1-9]\d{7,14}$/;

const exported = JSON.parse(readFileSync(EXPORT, 'utf8'));
/** Firebase uid → E.164 phone, for accounts that have one. */
const phoneByUid = new Map(
  (exported.users ?? [])
    .filter(u => typeof u.phoneNumber === 'string' && E164.test(u.phoneNumber))
    .map(u => [u.localId, u.phoneNumber]),
);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, phone_number');
if (pErr) throw new Error(`profiles read failed: ${pErr.message}`);
const { data: sites, error: sErr } = await supabase.from('sites').select('user_id');
if (sErr) throw new Error(`sites read failed: ${sErr.message}`);

const profileById = new Map(profiles.map(p => [p.id, p]));
const owners = [...new Set(sites.map(s => s.user_id))];

const fill = profiles.filter(p => !p.phone_number && phoneByUid.has(p.id));
const create = owners.filter(uid => !profileById.has(uid));
const stillMissing = owners.filter(uid => !(profileById.get(uid)?.phone_number) && !phoneByUid.has(uid));

console.log(`Firebase accounts with a phone: ${phoneByUid.size}`);
console.log(`Store owners: ${owners.length}`);
console.log(`Profiles to fill a phone:       ${fill.length}`);
for (const p of fill) console.log(`  fill    ${p.id.slice(0, 6)}…  ${mask(phoneByUid.get(p.id))}`);
console.log(`Owners with no profile to create: ${create.length}`);
for (const uid of create) console.log(`  create  ${uid.slice(0, 6)}…  ${mask(phoneByUid.get(uid))}`);
console.log(`Owners still without a phone afterwards: ${stillMissing.length}`);
for (const uid of stillMissing) console.log(`  missing ${uid.slice(0, 6)}…  (no phone in Firebase either)`);

if (!APPLY) {
  console.log('\nDry run. Nothing written. Re-run with --apply to write.');
  process.exit(0);
}

let filled = 0;
for (const p of fill) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ phone_number: phoneByUid.get(p.id), updated_at: new Date().toISOString() })
    .eq('id', p.id)
    .is('phone_number', null)
    .select('id');
  if (error) console.error(`  fill failed ${p.id.slice(0, 6)}…: ${error.message}`);
  else filled += data.length;
}

let created = 0;
for (const uid of create) {
  const { error } = await supabase.from('profiles').upsert(
    { id: uid, full_name: '', contact_email: '', phone_number: phoneByUid.get(uid) ?? null, onboarding_completed: true },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) console.error(`  create failed ${uid.slice(0, 6)}…: ${error.message}`);
  else created++;
}

console.log(`\nApplied: ${filled} phones filled, ${created} profiles created.`);
