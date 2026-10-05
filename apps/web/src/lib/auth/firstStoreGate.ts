import 'server-only';
import { verifyFirebaseToken } from '@/lib/auth/verifyFirebaseToken';
import { supabaseServer } from '@/lib/platform/db/supabase-server';

/**
 * Server-side first-store gate for every /manage page.
 *
 * A first-time owner must finish onboarding — which ends by creating their
 * first store — before they see the dashboard. The browser gate in
 * ManageLayoutClient made this decision alone, and it could be wrong both
 * ways: a failed site fetch read as "no stores" (an existing owner sent to
 * onboarding), and a failed profile read let a storeless owner in.
 *
 * Owning a site is the deciding fact. 'unknown' means the server could not
 * tell — no valid session (middleware's job) or a database error — and the
 * page falls back to the browser gate rather than guessing.
 */
export type ManageAccess = 'allow' | 'onboard' | 'unknown';

export async function manageAccess(token: string | undefined): Promise<ManageAccess> {
    if (!token) return 'unknown';
    const uid = await verifyFirebaseToken(token);
    if (!uid) return 'unknown';

    // One row is enough to answer; never read the whole list here.
    const { data, error } = await supabaseServer
        .from('sites')
        .select('id')
        .eq('user_id', uid)
        .limit(1);
    if (error) return 'unknown';
    return (data ?? []).length > 0 ? 'allow' : 'onboard';
}
