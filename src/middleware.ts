import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = [
    '/manage/dashboard',
    '/manage/my-shop',
    '/manage/menu',
    '/manage/recharge',
    '/manage/settings',
];

// Simple in-memory rate store (Note: In a true multi-server deployment like Vercel/Netlify Edge, 
// this is isolated per isolate, but sufficient for basic protection without Redis)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 AI requests per minute per IP

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // --- RATE LIMITING FOR AI ENDPOINTS ---
    if (pathname.startsWith('/api/process-voice')) {
        const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown-ip';
        const now = Date.now();
        const record = rateLimitStore.get(ip);

        if (record) {
            // Check if window has expired
            if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
                rateLimitStore.set(ip, { count: 1, timestamp: now });
            } else {
                // Within window, increment count
                record.count += 1;
                if (record.count > MAX_REQUESTS_PER_WINDOW) {
                    console.warn(`Rate limit exceeded for IP: ${ip}`);
                    return NextResponse.json(
                        { error: 'Too many requests. Please try again later.' },
                        { status: 429, headers: { 'Retry-After': '60' } }
                    );
                }
            }
        } else {
            rateLimitStore.set(ip, { count: 1, timestamp: now });
        }

        // Memory cleanup roughly (to prevent map growing indefinitely)
        if (rateLimitStore.size > 1000) {
            const entries = Array.from(rateLimitStore.entries());
            for (const [key, val] of entries) {
                if (now - val.timestamp > RATE_LIMIT_WINDOW_MS) {
                    rateLimitStore.delete(key);
                }
            }
        }
    }
    // --- END RATE LIMITING ---

    // Check if the current path is a protected route
    const isProtected = PROTECTED_PATHS.some(
        (path) => pathname === path || pathname.startsWith(path + '/')
    );

    if (!isProtected) {
        return NextResponse.next();
    }

    // Try to get the Supabase session from cookies
    const accessToken =
        request.cookies.get('sb-access-token')?.value ||
        request.cookies.get(`sb-${getSupabaseProjectRef()}-auth-token`)?.value;

    let hasValidSession = false;

    if (accessToken) {
        try {
            const parsed = JSON.parse(accessToken);
            if (parsed?.access_token || parsed?.[0]?.access_token) {
                hasValidSession = true;
            }
        } catch {
            if (accessToken.length > 20) {
                hasValidSession = true;
            }
        }
    }

    if (!hasValidSession) {
        const allCookies = request.cookies.getAll();
        const supabaseAuthCookie = allCookies.find(
            (cookie) =>
                cookie.name.includes('supabase') ||
                (cookie.name.startsWith('sb-') && cookie.name.includes('auth'))
        );
        if (supabaseAuthCookie && supabaseAuthCookie.value.length > 20) {
            hasValidSession = true;
        }
    }

    if (!hasValidSession) {
        // Redirect to login page
        const loginUrl = new URL('/manage', request.url);
        loginUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

function getSupabaseProjectRef(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const match = url.match(/https:\/\/([^.]+)\.supabase/);
    return match?.[1] || '';
}

export const config = {
    matcher: ['/manage/:path*', '/api/process-voice'],
};
