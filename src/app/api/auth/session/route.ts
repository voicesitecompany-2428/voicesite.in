import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';

const COOKIE_NAME = 'sb-access-token';
const IS_PROD = process.env.NODE_ENV === 'production';

// POST /api/auth/session — verify Firebase token server-side, set HttpOnly cookie
export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token || typeof token !== 'string' || token.length < 20) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Cryptographically verify before setting — never blindly trust client input
        const uid = await verifyFirebaseToken(token);
        if (!uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Decode exp from JWT payload to match cookie lifetime to token expiry
        let maxAge = 3600;
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const padded = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4);
                const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
                if (typeof payload.exp === 'number') {
                    maxAge = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
                }
            }
        } catch {
            // malformed JWT — fall back to 1h default
        }

        const response = NextResponse.json({ ok: true });
        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,           // not readable by JS — XSS cannot steal it
            secure: IS_PROD,          // HTTPS only in production
            sameSite: 'lax',          // allows GET navigations from external links (WhatsApp, etc.)
            path: '/',
            maxAge,
        });
        return response;
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
}

// DELETE /api/auth/session — clear the auth cookie on sign-out
export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}
