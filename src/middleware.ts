import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Routes that require authentication
const PROTECTED_PATHS = [
    '/manage/dashboard',
    '/manage/product-inventory',
    '/manage/banner-management',
    '/manage/transactions',
    '/manage/settings',
    '/onboarding',
];

// Auth routes — logged-in users should be bounced to dashboard
const AUTH_PATHS = ['/login', '/signup'];

// jose caches the JWKS after the first fetch and handles key rotation automatically.
// This module-level singleton is reused across all middleware invocations.
const FIREBASE_JWKS = createRemoteJWKSet(
    new URL(
        'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
    )
);

/**
 * Cryptographically verifies a Firebase ID token.
 * Checks: RS256 signature, exp, iss, aud.
 * Returns true only when the token is genuine and unexpired.
 *
 * Replaces the previous decodeJwt/isTokenValid approach which only
 * checked the exp claim and was bypassable with a forged token.
 */
async function isTokenValid(token: string | undefined): Promise<boolean> {
    if (!token || token.length < 20) return false;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return false;
    try {
        await jwtVerify(token, FIREBASE_JWKS, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
        });
        return true;
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get('sb-access-token')?.value;
    const validSession = await isTokenValid(token);

    // ── AUTH PAGES: bounce logged-in users to dashboard ─────────
    if (AUTH_PATHS.some((p) => pathname === p)) {
        if (validSession) {
            return NextResponse.redirect(new URL('/manage/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // ── HOME PAGE: redirect logged-in users straight to dashboard ─
    if (pathname === '/') {
        if (validSession) {
            return NextResponse.redirect(new URL('/manage/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // ── PROTECTED PAGES ──────────────────────────────────────────
    const isProtected = PROTECTED_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    );

    if (!isProtected) return NextResponse.next();

    if (!validSession) {
        const hasToken = !!token && token.length > 20;
        const loginUrl = new URL('/login', request.url);
        // Only allow redirectTo to internal paths — blocks open-redirect attacks
        if (pathname.startsWith('/')) {
            loginUrl.searchParams.set('redirectTo', pathname);
        }
        // Mark as expired only when a token was present but invalid/expired
        if (hasToken) loginUrl.searchParams.set('expired', 'true');
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/signup', '/onboarding', '/manage/:path*'],
};
