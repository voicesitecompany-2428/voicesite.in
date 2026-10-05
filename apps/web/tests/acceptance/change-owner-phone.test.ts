/**
 * An owner changes their own sign-in number (new SIM, lost phone).
 *
 * The sign-in number is the Firebase phone login, and profiles.phone_number
 * (where WhatsApp reaches the owner) must follow it. Before this, nothing in the
 * app could change it: an owner with a new SIM could only sign up again and
 * start an empty account.
 *
 * Flow: the owner proves the NEW number with an OTP (Firebase updatePhoneNumber),
 * then the browser sends its refreshed ID token to PUT /api/profile/phone. The
 * server takes the phone from that verified token, never from the body.
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
vi.mock('@/lib/auth/verifyFirebaseToken', () => ({
    verifyFirebaseToken: async (t: string) => {
        const parts = t.split('.');
        if (parts.length !== 3) return null;
        return (JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: string }).sub ?? null;
    },
}));

import { PUT as changePhone } from '@/app/api/profile/phone/route';
import { friendlyPhoneChangeError } from '@/lib/auth/changePhoneErrors';

const WEB = join(__dirname, '..', '..');
const src = (p: string) => readFileSync(join(WEB, 'src', p), 'utf8').replace(/\r\n/g, '\n');
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function token(claims: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}.sig`;
}
let ipSeq = 0;
function put(init: { token?: string; body?: unknown } = {}): NextRequest {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-real-ip': `10.1.0.${++ipSeq}` };
    if (init.token) headers.authorization = `Bearer ${init.token}`;
    return new NextRequest('http://localhost/api/profile/phone', {
        method: 'PUT', headers, body: init.body === undefined ? '{}' : JSON.stringify(init.body),
    });
}
const profiles = () => holder.db.tables.profiles as Array<Record<string, unknown>>;

beforeEach(() => {
    holder.db = createFakeDb({
        tables: { profiles: [] },
        unique: { profiles: ['id'] },
    });
});

describe('PUT /api/profile/phone', () => {
    const newTok = token({ sub: 'u1', phone_number: '+919111111111' });

    it('401 without a token, 401 for a bad one', async () => {
        expect((await changePhone(put())).status).toBe(401);
        expect((await changePhone(put({ token: 'bad' }))).status).toBe(401);
    });

    it('400 when the token has no phone (a non-phone login cannot set one)', async () => {
        const res = await changePhone(put({ token: token({ sub: 'u1' }) }));
        expect(res.status).toBe(400);
    });

    it('replaces the stored phone with the one in the verified token', async () => {
        profiles().push({ id: 'u1', phone_number: '+919000000001', full_name: 'Priya' });
        const res = await changePhone(put({ token: newTok }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, phone: '+919111111111' });
        expect(profiles()[0].phone_number).toBe('+919111111111');
        expect(profiles()[0].full_name).toBe('Priya');
    });

    it('ignores a phone sent in the body: only the token counts', async () => {
        profiles().push({ id: 'u1', phone_number: '+919000000001' });
        await changePhone(put({ token: newTok, body: { phone: '+919222222222' } }));
        expect(profiles()[0].phone_number).toBe('+919111111111');
    });

    it("touches only this owner's row", async () => {
        profiles().push({ id: 'u1', phone_number: '+919000000001' }, { id: 'u2', phone_number: '+919000000002' });
        await changePhone(put({ token: newTok }));
        expect(profiles()[1].phone_number).toBe('+919000000002');
    });

    it('creates the profile when it is missing', async () => {
        const res = await changePhone(put({ token: newTok }));
        expect(res.status).toBe(200);
        expect(profiles()[0]).toMatchObject({ id: 'u1', phone_number: '+919111111111' });
    });

    it('409 when another profile already holds that number', async () => {
        profiles().push({ id: 'u1', phone_number: '+919000000001' }, { id: 'u2', phone_number: '+919111111111' });
        const res = await changePhone(put({ token: newTok }));
        expect(res.status).toBe(409);
        expect(profiles()[0].phone_number).toBe('+919000000001');
    });

    it('500 with a plain message when the database fails', async () => {
        profiles().push({ id: 'u1', phone_number: '+919000000001' });
        holder.db.failNext = { table: 'profiles', op: 'update' };
        const res = await changePhone(put({ token: newTok }));
        expect(res.status).toBe(500);
        expect((await res.json()).error).toMatch(/try again/i);
    });

    it('rate-limits one device', async () => {
        const mk = () => { const r = put({ token: newTok }); r.headers.set('x-real-ip', '10.7.7.7'); return r; };
        let last = 200;
        for (let i = 0; i < 7; i++) last = (await changePhone(mk())).status;
        expect(last).toBe(429);
    });
});

describe('friendlyPhoneChangeError', () => {
    it('explains the cases an owner can act on', () => {
        expect(friendlyPhoneChangeError('auth/credential-already-in-use')).toMatch(/already has a vsite account/i);
        expect(friendlyPhoneChangeError('auth/account-exists-with-different-credential')).toMatch(/already has a vsite account/i);
        expect(friendlyPhoneChangeError('auth/requires-recent-login')).toMatch(/sign out and sign in again/i);
        expect(friendlyPhoneChangeError('auth/invalid-verification-code')).toMatch(/incorrect/i);
        expect(friendlyPhoneChangeError('auth/code-expired')).toMatch(/expired/i);
        expect(friendlyPhoneChangeError('auth/too-many-requests')).toMatch(/too many/i);
        expect(friendlyPhoneChangeError('something-else')).toMatch(/try again/i);
    });
});

describe('the app lets an owner start a number change', () => {
    it('AuthContext exposes startPhoneChange / confirmPhoneChange built on updatePhoneNumber', () => {
        const ctx = noComments(src('components/AuthContext.tsx'));
        expect(ctx).toMatch(/startPhoneChange/);
        expect(ctx).toMatch(/confirmPhoneChange/);
        expect(ctx).toMatch(/updatePhoneNumber\(/);
        expect(ctx).toMatch(/getIdToken\(true\)/);
        expect(ctx).toMatch(/\/api\/profile\/phone/);
    });

    it('the You tab has a "Your number" row that opens the dialog', () => {
        const you = src('app/manage/you/page.tsx');
        expect(you).toMatch(/OwnerPhoneDialog/);
        expect(you).toMatch(/Your number/);
    });

    it('the dashboard header menu offers "Change your number"', () => {
        const header = src('components/DashboardHeader.tsx');
        expect(header).toMatch(/OwnerPhoneDialog/);
        expect(header).toMatch(/Change your number/);
    });

    it('the dialog never offers a number that is not a valid Indian mobile', () => {
        const dialog = src('components/OwnerPhoneDialog.tsx');
        expect(dialog).toMatch(/toIndianE164\(/);
        expect(dialog).toMatch(/recaptcha-container-phone/);
    });
});
