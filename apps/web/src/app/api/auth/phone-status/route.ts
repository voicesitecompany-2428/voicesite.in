import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/platform/rateLimit';
import { toIndianE164 } from '@/lib/auth/phoneNumber';
import { phoneAccountStatus } from '@/lib/auth/registerOwner';

/**
 * POST /api/auth/phone-status — { phone } → { success, exists }
 *
 * Asked by /login and /signup BEFORE an OTP is sent, so no SMS is spent on a
 * number that is on the wrong page (and none on numbers bots feed in).
 *
 * This does tell a caller whether a number has a vsite account. That is the
 * accepted trade-off for merchant tools that log in by registered number
 * (Petpooja, Razorpay); owners' numbers are often printed on their menus. The
 * per-device limit keeps it from being a bulk lookup service.
 */

const LIMIT_PER_MIN = 10;

export async function POST(request: NextRequest) {
    const rl = rateLimit(`phone-status:${getClientIp(request.headers)}`, { limit: LIMIT_PER_MIN, windowMs: 60_000 });
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } },
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const raw = typeof body === 'object' && body !== null ? (body as { phone?: unknown }).phone : undefined;
    const phone = typeof raw === 'string' ? toIndianE164(raw) : null;
    if (!phone) {
        return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const status = await phoneAccountStatus(phone);
    if (status === 'unknown') {
        // The page sends the OTP anyway: an outage must not lock owners out.
        return NextResponse.json({ error: 'Account check unavailable' }, { status: 503 });
    }
    return NextResponse.json({ success: true, exists: status === 'yes' });
}
