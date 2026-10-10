import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth/verifyFirebaseToken';
import { phoneFromIdToken } from '@/lib/auth/profilePhone';
import { cleanOwnerName } from '@/lib/auth/ownerName';
import { setOwnerName } from '@/lib/auth/registerOwner';
import { logger } from '@/lib/platform/logger';

/**
 * PUT /api/profile/name — { name } with `Authorization: Bearer <Firebase ID token>`
 *
 * The owner sets or changes their own name (dashboard header, You tab). Unlike
 * signup this replaces a stored name: it is the owner's own edit.
 */
export async function PUT(request: NextRequest) {
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
        return NextResponse.json({ error: 'Enter your name, up to 60 letters.' }, { status: 400 });
    }

    try {
        await setOwnerName(uid, phoneFromIdToken(idToken), name);
    } catch (err) {
        logger.error('[profile/name] failed:', err instanceof Error ? err.message : 'unknown');
        return NextResponse.json({ error: 'Could not save your name. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, name });
}
