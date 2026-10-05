import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth/verifyFirebaseToken';
import { phoneFromIdToken } from '@/lib/auth/profilePhone';
import { replaceProfilePhone } from '@/lib/auth/registerOwner';
import { rateLimit, getClientIp } from '@/lib/platform/rateLimit';
import { logger } from '@/lib/platform/logger';

/**
 * PUT /api/profile/phone — `Authorization: Bearer <Firebase ID token>`, no body.
 *
 * Called after the owner proved a NEW number with an OTP and Firebase updated
 * the login (updatePhoneNumber). The browser sends the refreshed token; the
 * phone is read from it, never from the request, so nobody can attach a number
 * they did not prove. profiles.phone_number is where WhatsApp reaches the owner.
 */
export async function PUT(request: NextRequest) {
    const rl = rateLimit(`profile-phone:${getClientIp(request.headers)}`, { limit: 6, windowMs: 60_000 });
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } },
        );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice('Bearer '.length);
    const uid = await verifyFirebaseToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const phone = phoneFromIdToken(idToken);
    if (!phone) {
        return NextResponse.json({ error: 'This sign-in has no phone number.' }, { status: 400 });
    }

    try {
        const result = await replaceProfilePhone(uid, phone);
        if (result === 'taken') {
            return NextResponse.json({ error: 'This number already has a vsite account.' }, { status: 409 });
        }
    } catch (err) {
        logger.error('[profile/phone] failed:', err instanceof Error ? err.message : 'unknown');
        return NextResponse.json({ error: 'Could not save your number. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, phone });
}
