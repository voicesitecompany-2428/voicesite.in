import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth/verifyFirebaseToken';
import { phoneFromIdToken } from '@/lib/auth/profilePhone';
import { cleanOwnerName } from '@/lib/auth/ownerName';
import { registerOwner } from '@/lib/auth/registerOwner';
import { logger } from '@/lib/platform/logger';

/**
 * POST /api/auth/register — { name } with `Authorization: Bearer <Firebase ID token>`
 *
 * Called by verifyOTP on /signup right after the OTP is accepted. Creates the
 * owner's profile and fills a blank name and phone; never overwrites stored
 * values. The phone is read from the verified token (the number proved with
 * OTP) — a phone in the body is ignored.
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice('Bearer '.length);
    const uid = await verifyFirebaseToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const name = cleanOwnerName(typeof body === 'object' && body !== null ? (body as { name?: unknown }).name : undefined);
    if (!name) {
        return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }

    try {
        await registerOwner(uid, phoneFromIdToken(idToken), name);
    } catch (err) {
        logger.error('[auth/register] failed:', err instanceof Error ? err.message : 'unknown');
        return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
