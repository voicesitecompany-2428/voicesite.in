/**
 * Accounts: who may sign in, what we store about them, and where they land.
 *
 * Owner request (2026-10-05):
 *   1. Before sending a login OTP, check whether the number has an account.
 *      No account → no SMS, "Account not found, please create an account".
 *      Account → OTP as usual.
 *   2. When an owner signs up and creates a store, store their name and phone.
 *   3. A first-time owner must finish onboarding before the dashboard. Later
 *      stores keep working as they do now.
 *   4. The dashboard header showed "Owner" instead of a name. Fix that too.
 *
 * Root cause behind (2) and (4), found in the Supabase edge logs for signup
 * 04Re8… at 09:19 UTC: both OTP pages had an "already signed in → leave"
 * effect. Firebase's confirm() sets the user, the effect fires at once and
 * navigates to /manage/dashboard while verifyOTP is still writing the profile.
 * The profile POST never reached Supabase, /auth/continue never ran, and the
 * row was later created by /api/onboarding/complete with no name and no phone.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { createFakeDb, fakeClient, type FakeDb } from '../fixtures/fakeSupabase';

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/platform/db/supabase-server', () => ({
    supabaseServer: { from: (t: string) => fakeClient(holder.db).from(t) },
}));
// Signature checks are verifyFirebaseToken's own suite. Here: any JWT-shaped
// token is valid and its `sub` is the uid; 'bad' is rejected.
vi.mock('@/lib/auth/verifyFirebaseToken', () => ({
    verifyFirebaseToken: async (t: string) => {
        const parts = t.split('.');
        if (parts.length !== 3) return null;
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: string };
        return claims.sub ?? null;
    },
}));

import { POST as phoneStatus } from '@/app/api/auth/phone-status/route';
import { POST as register } from '@/app/api/auth/register/route';
import { PUT as setName } from '@/app/api/profile/name/route';
import { toIndianE164 } from '@/lib/auth/phoneNumber';
import { cleanOwnerName } from '@/lib/auth/ownerName';
import { otpPrecheck } from '@/lib/auth/otpPrecheck';
import { LOGIN_REQUIRES_ACCOUNT } from '@/lib/auth/authFlags';
import { manageAccess } from '@/lib/auth/firstStoreGate';
import { ownerNameForStore } from '@/lib/auth/registerOwner';
import { decideOnboardingGate } from '@/lib/auth/onboardingGate';
import { ownerNameLine } from '@/lib/ui/headerIdentity';

const WEB = join(__dirname, '..', '..');
// Windows checkouts get CRLF; every pattern below is written with \n.
const src = (p: string) => readFileSync(join(WEB, 'src', p), 'utf8').replace(/\r\n/g, '\n');
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function token(claims: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}.sig`;
}

let ipSeq = 0;
function req(url: string, init: { method?: string; body?: unknown; token?: string; ip?: string } = {}): NextRequest {
    const headers: Record<string, string> = {
        'content-type': 'application/json',
        'x-real-ip': init.ip ?? `10.0.0.${++ipSeq}`,
    };
    if (init.token) headers.authorization = `Bearer ${init.token}`;
    return new NextRequest(`http://localhost${url}`, {
        method: init.method ?? 'POST',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
}

const profiles = () => holder.db.tables.profiles as Array<Record<string, unknown>>;
const sites = () => holder.db.tables.sites as Array<Record<string, unknown>>;

beforeEach(() => {
    holder.db = createFakeDb({
        tables: { profiles: [], sites: [], user_subscriptions: [] },
        unique: { profiles: ['id'], user_subscriptions: ['user_id'] },
    });
});

// ── Phone numbers ───────────────────────────────────────────────────────────

describe('toIndianE164', () => {
    it('accepts the forms an owner actually types', () => {
        expect(toIndianE164('9876543210')).toBe('+919876543210');
        expect(toIndianE164('98765 43210')).toBe('+919876543210');
        expect(toIndianE164('+91 98765-43210')).toBe('+919876543210');
        expect(toIndianE164('919876543210')).toBe('+919876543210');
        expect(toIndianE164('09876543210')).toBe('+919876543210');
    });
    it('rejects anything that is not a 10-digit Indian mobile', () => {
        expect(toIndianE164('12345')).toBeNull();
        expect(toIndianE164('1234567890')).toBeNull(); // mobiles start 6-9
        expect(toIndianE164('')).toBeNull();
        expect(toIndianE164('abcdefghij')).toBeNull();
    });
});

// ── 1. Login checks the number before any SMS ──────────────────────────────

describe('POST /api/auth/phone-status', () => {
    it('says a registered number exists', async () => {
        profiles().push({ id: 'u1', phone_number: '+919876543210' });
        const res = await phoneStatus(req('/api/auth/phone-status', { body: { phone: '9876543210' } }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, exists: true });
    });

    it('says an unknown number does not exist', async () => {
        profiles().push({ id: 'u1', phone_number: '+919876543210' });
        const res = await phoneStatus(req('/api/auth/phone-status', { body: { phone: '9000000001' } }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, exists: false });
    });

    it('400 for a number that is not a valid mobile', async () => {
        const res = await phoneStatus(req('/api/auth/phone-status', { body: { phone: '123' } }));
        expect(res.status).toBe(400);
    });

    it('400 for a body that is not JSON with a phone string', async () => {
        const res = await phoneStatus(req('/api/auth/phone-status', { body: { phone: 9876543210 } }));
        expect(res.status).toBe(400);
    });

    it('503 when the database cannot answer, so the page can fall back to the OTP', async () => {
        holder.db.failNext = { table: 'profiles', op: 'select' };
        const res = await phoneStatus(req('/api/auth/phone-status', { body: { phone: '9876543210' } }));
        expect(res.status).toBe(503);
    });

    it('rate-limits one device: the 11th check in a minute is refused', async () => {
        const ip = '10.9.9.9';
        for (let i = 0; i < 10; i++) {
            const ok = await phoneStatus(req('/api/auth/phone-status', { body: { phone: '9876543210' }, ip }));
            expect(ok.status).toBe(200);
        }
        const blocked = await phoneStatus(req('/api/auth/phone-status', { body: { phone: '9876543210' }, ip }));
        expect(blocked.status).toBe(429);
        expect(blocked.headers.get('Retry-After')).toBeTruthy();
    });
});

describe('otpPrecheck: what each page does with the answer', () => {
    it('login with the flag on: unknown number is refused, no SMS', () => {
        expect(otpPrecheck('login', 'no', true)).toBe('not_found');
        expect(otpPrecheck('login', 'yes', true)).toBe('send');
    });
    it('login never locks anyone out when the check itself fails', () => {
        expect(otpPrecheck('login', 'unknown', true)).toBe('send');
    });
    it('login with the flag off behaves exactly as before', () => {
        expect(otpPrecheck('login', 'no', false)).toBe('send');
    });
    it('signup with a registered number points the owner to login', () => {
        expect(otpPrecheck('signup', 'yes', true)).toBe('already_exists');
        expect(otpPrecheck('signup', 'yes', false)).toBe('already_exists');
        expect(otpPrecheck('signup', 'no', true)).toBe('send');
        expect(otpPrecheck('signup', 'unknown', true)).toBe('send');
    });
    it('the login check ships OFF until existing owners have their phone stored', () => {
        // 25 owners with stores have no phone on file (2026-10-05). Turning the
        // check on before the backfill would lock them out.
        expect(LOGIN_REQUIRES_ACCOUNT).toBe(false);
    });
});

describe('the OTP pages use the precheck before sending', () => {
    const handleSend = (s: string) => {
        const start = s.indexOf('const handleSendOTP');
        return s.slice(start, s.indexOf('\n  };', start));
    };

    it('login asks the server before sendOTP and shows the not-found message', () => {
        const page = src('app/login/page.tsx');
        const body = noComments(handleSend(page));
        expect(body).toMatch(/checkPhoneAccount\(/);
        expect(body.indexOf('checkPhoneAccount(')).toBeLessThan(body.indexOf('sendOTP('));
        expect(body).toMatch(/otpPrecheck\(\s*'login'/);
        expect(page).toContain('No vsite account for this number');
        expect(page).toMatch(/\/signup\?phone=/);
    });

    it('signup asks the server before sendOTP and points existing owners to login', () => {
        const page = src('app/signup/page.tsx');
        const body = noComments(handleSend(page));
        expect(body.indexOf('checkPhoneAccount(')).toBeGreaterThan(-1);
        expect(body.indexOf('checkPhoneAccount(')).toBeLessThan(body.indexOf('sendOTP('));
        expect(body).toMatch(/otpPrecheck\(\s*'signup'/);
        expect(page).toContain('You already have an account with this number');
        expect(page).toMatch(/\/login\?phone=/);
    });
});

// ── 2. Name and phone are stored ────────────────────────────────────────────

describe('the redirect race that lost every name', () => {
    const signedInEffect = (s: string) => {
        const start = s.indexOf('useEffect(() => {\n    if (!authLoading && user');
        expect(start, 'signed-in redirect effect not found').toBeGreaterThan(-1);
        return s.slice(start, s.indexOf('}, [', start));
    };

    it.each(['app/login/page.tsx', 'app/signup/page.tsx'])('%s does not leave while an OTP is being verified', (file) => {
        const page = src(file);
        expect(page).toMatch(/const verifyingRef = useRef\(false\)/);
        expect(signedInEffect(page)).toMatch(/verifyingRef\.current/);
        // Set before verifyOTP so the effect sees it the moment confirm() resolves.
        const verify = noComments(page.slice(page.indexOf('const handleVerify'), page.indexOf('verifyRef.current =')));
        expect(verify.indexOf('verifyingRef.current = true')).toBeGreaterThan(-1);
        expect(verify.indexOf('verifyingRef.current = true')).toBeLessThan(verify.indexOf('verifyOTP('));
    });

    it.each(['app/login/page.tsx', 'app/signup/page.tsx'])('%s sends an already-signed-in owner through /auth/continue', (file) => {
        expect(signedInEffect(src(file))).toMatch(/\/auth\/continue/);
    });

    it('verifyOTP saves the signup name through the server, not only from the browser', () => {
        const ctx = noComments(src('components/AuthContext.tsx'));
        const verify = ctx.slice(ctx.indexOf('const verifyOTP'), ctx.indexOf('const signOut'));
        expect(verify).toMatch(/\/api\/auth\/register/);
    });
});

describe('cleanOwnerName', () => {
    it('trims and collapses spaces', () => {
        expect(cleanOwnerName('  Priya   Raman ')).toBe('Priya Raman');
        expect(cleanOwnerName('முருகன்')).toBe('முருகன்');
    });
    it('rejects empty, phone-like, too long and non-string values', () => {
        expect(cleanOwnerName('')).toBeNull();
        expect(cleanOwnerName('   ')).toBeNull();
        expect(cleanOwnerName('+919876543210')).toBeNull();
        expect(cleanOwnerName('x'.repeat(61))).toBeNull();
        expect(cleanOwnerName(42)).toBeNull();
    });
});

describe('POST /api/auth/register', () => {
    const t = token({ sub: 'u1', phone_number: '+919876543210' });

    it('401 without a bearer token, 401 for a bad one', async () => {
        expect((await register(req('/api/auth/register', { body: { name: 'Priya' } }))).status).toBe(401);
        expect((await register(req('/api/auth/register', { body: { name: 'Priya' }, token: 'bad' }))).status).toBe(401);
    });

    it('400 for a missing or invalid name', async () => {
        expect((await register(req('/api/auth/register', { body: {}, token: t }))).status).toBe(400);
        expect((await register(req('/api/auth/register', { body: { name: '9876543210' }, token: t }))).status).toBe(400);
    });

    it('creates the profile with the typed name and the phone proved by OTP', async () => {
        const res = await register(req('/api/auth/register', { body: { name: ' Priya ', phone: '+910000000000' }, token: t }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
        const row = profiles().find(p => p.id === 'u1');
        expect(row?.full_name).toBe('Priya');
        // The phone comes from the verified token, never from the request body.
        expect(row?.phone_number).toBe('+919876543210');
    });

    it('fills a blank name on a row created without one (null or empty)', async () => {
        profiles().push({ id: 'u1', full_name: null, phone_number: null });
        await register(req('/api/auth/register', { body: { name: 'Priya' }, token: t }));
        expect(profiles()[0].full_name).toBe('Priya');
        expect(profiles()[0].phone_number).toBe('+919876543210');

        holder.db.tables.profiles = [{ id: 'u1', full_name: '', phone_number: '+919876543210' }];
        await register(req('/api/auth/register', { body: { name: 'Priya' }, token: t }));
        expect(profiles()[0].full_name).toBe('Priya');
    });

    it('never overwrites a name or phone that is already stored', async () => {
        profiles().push({ id: 'u1', full_name: 'Murugan', phone_number: '+919800000001' });
        await register(req('/api/auth/register', { body: { name: 'Priya' }, token: t }));
        expect(profiles()[0].full_name).toBe('Murugan');
        expect(profiles()[0].phone_number).toBe('+919800000001');
    });
});

describe('PUT /api/profile/name: the owner can set or change their name', () => {
    const t = token({ sub: 'u1', phone_number: '+919876543210' });

    it('401 without a token', async () => {
        expect((await setName(req('/api/profile/name', { method: 'PUT', body: { name: 'Priya' } }))).status).toBe(401);
    });

    it('400 for an invalid name', async () => {
        expect((await setName(req('/api/profile/name', { method: 'PUT', body: { name: '' }, token: t }))).status).toBe(400);
    });

    it('sets the name, replacing the old one, on this owner only', async () => {
        profiles().push({ id: 'u1', full_name: 'Old', phone_number: null }, { id: 'u2', full_name: 'Other' });
        const res = await setName(req('/api/profile/name', { method: 'PUT', body: { name: 'Priya Raman' }, token: t }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, name: 'Priya Raman' });
        expect(profiles()[0].full_name).toBe('Priya Raman');
        expect(profiles()[1].full_name).toBe('Other');
    });

    it('creates the profile if it is missing, with the verified phone', async () => {
        const res = await setName(req('/api/profile/name', { method: 'PUT', body: { name: 'Priya' }, token: t }));
        expect(res.status).toBe(200);
        expect(profiles()[0]).toMatchObject({ id: 'u1', full_name: 'Priya', phone_number: '+919876543210' });
    });
});

describe('a new store carries the owner name', () => {
    it('ownerNameForStore reads the profile name, or null', async () => {
        profiles().push({ id: 'u1', full_name: ' Priya ' }, { id: 'u2', full_name: '' });
        expect(await ownerNameForStore('u1')).toBe('Priya');
        expect(await ownerNameForStore('u2')).toBeNull();
        expect(await ownerNameForStore('nobody')).toBeNull();
    });

    it('/api/onboarding/complete writes owner_name on the site insert', () => {
        const route = noComments(src('app/api/onboarding/complete/route.ts'));
        expect(route).toMatch(/ownerNameForStore\(/);
        const insert = route.slice(route.indexOf(".from('sites')\n      .insert("), route.indexOf('.select(\'id, slug\')'));
        expect(insert).toMatch(/owner_name/);
    });

    it('the store phone is the sign-in number (owner decision 2026-10-05)', () => {
        // Was "never copy the phone into contact_number". The owner overruled
        // it: the sign-in number is the store's number, permanent. Covered in
        // full by tests/acceptance/store-phone-locked.test.ts.
        const route = noComments(src('app/api/onboarding/complete/route.ts'));
        expect(route).toMatch(/contact_number/);
    });
});

// ── 3. First store before the dashboard ────────────────────────────────────

describe('manageAccess: the server-side first-store gate', () => {
    const t = token({ sub: 'u1' });

    it('an owner with no store is sent to onboarding', async () => {
        expect(await manageAccess(t)).toBe('onboard');
    });

    it('an owner with a store gets the dashboard', async () => {
        sites().push({ id: 's1', user_id: 'u1' });
        expect(await manageAccess(t)).toBe('allow');
    });

    it("another owner's store does not count", async () => {
        sites().push({ id: 's1', user_id: 'u2' });
        expect(await manageAccess(t)).toBe('onboard');
    });

    it('unknown when the database fails: never guess an existing owner into onboarding', async () => {
        holder.db.failNext = { table: 'sites', op: 'select' };
        expect(await manageAccess(t)).toBe('unknown');
    });

    it('unknown without a valid session: authentication is middleware\'s job', async () => {
        expect(await manageAccess(undefined)).toBe('unknown');
        expect(await manageAccess('bad')).toBe('unknown');
    });

    it('the /manage layout redirects to first-store onboarding on "onboard"', () => {
        const layout = noComments(src('app/manage/layout.tsx'));
        expect(layout).toMatch(/manageAccess\(/);
        expect(layout).toMatch(/redirect\(onboardingPath\('first-store'\)\)/);
    });
});

describe('the browser gate no longer mistakes a failed store fetch for "no stores"', () => {
    it('a site-list error lets the owner through without repairs', () => {
        expect(decideOnboardingGate({ profile: null, profileError: false, siteCount: 0, sitesError: true }))
            .toEqual({ action: 'allow', repair: false });
    });

    it('SiteContext reports the fetch error instead of an empty list', () => {
        const ctx = noComments(src('components/SiteContext.tsx'));
        expect(ctx).toMatch(/sitesError/);
        expect(ctx).toMatch(/const \{ data, error \} = await supabase/);
    });
});

// ── 4. The header shows a name, or asks for one ─────────────────────────────

describe('ownerNameLine', () => {
    it('shows the stored name', () => {
        expect(ownerNameLine(' Priya ')).toEqual({ text: 'Priya', needsName: false });
    });
    it('asks for a name instead of saying "Owner"', () => {
        expect(ownerNameLine('')).toEqual({ text: 'Add your name', needsName: true });
        expect(ownerNameLine(null)).toEqual({ text: 'Add your name', needsName: true });
    });

    it('the dashboard header uses it and opens the name editor', () => {
        const header = src('components/DashboardHeader.tsx');
        expect(header).toMatch(/ownerNameLine\(/);
        expect(header).toMatch(/OwnerNameDialog/);
    });

    it('the You tab lets the owner set their name too', () => {
        expect(src('app/manage/you/page.tsx')).toMatch(/OwnerNameDialog/);
    });
});
