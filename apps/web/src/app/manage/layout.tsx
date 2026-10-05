import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ManageLayoutClient from '@/components/ManageLayoutClient';
import { manageAccess } from '@/lib/auth/firstStoreGate';
import { onboardingPath } from '@/lib/auth/postAuthDestination';

// Opt every /manage/* route out of Next's full route cache. Without this,
// statically prerendered pages are served with `s-maxage=31536000,
// stale-while-revalidate`, which invites any CDN in front of the origin to
// hold a copy of a signed-in page for a year — the header that let Cloudflare
// cache the dashboard's RSC payload and replay it as the HTML document.
// These pages are per-account and behind the auth gate; they must never be
// prerendered into a shared cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    // The root layout's template adds " | Vsite"; spelling it here doubled it.
    title: 'Dashboard',
    description: 'Manage your Vsite digital menu and shop settings.',
};

export default async function ManageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // First store before the dashboard, decided on the server before any HTML
    // ships. 'unknown' (no session, database error) falls through to the
    // browser gate in ManageLayoutClient instead of guessing.
    const access = await manageAccess(cookies().get('sb-access-token')?.value);
    if (access === 'onboard') redirect(onboardingPath('first-store'));

    return (
        <ManageLayoutClient>
            {children}
        </ManageLayoutClient>
    );
}
