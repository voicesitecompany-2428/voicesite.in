import 'server-only';
import { supabaseServer } from '@/lib/platform/db/supabase-server';
import { provisionUser } from '@/lib/auth/provisionUser';
import { backfillProfilePhone } from '@/lib/auth/profilePhone';
import type { PhoneAccountStatus } from '@/lib/auth/otpPrecheck';

/**
 * The owner's name and phone, written by the server.
 *
 * These used to be written only from the browser, inside verifyOTP — and the
 * OTP pages navigated away before that write finished, so most owners have no
 * name and no phone on file. Every function here runs on the server with the
 * service-role client, and takes the phone only from a Firebase token that was
 * verified in the same request.
 *
 * Fill-blank rule: signup fills an empty name or phone and never overwrites a
 * stored one. Only `setOwnerName`, the owner's own edit, replaces a name.
 */

async function fillBlankName(uid: string, name: string): Promise<void> {
    // Rows created by /api/onboarding/complete hold NULL; rows from
    // provisionUser hold ''. Both mean "no name yet".
    for (const blank of [null, ''] as const) {
        const q = supabaseServer
            .from('profiles')
            .update({ full_name: name, updated_at: new Date().toISOString() })
            .eq('id', uid);
        const { error } = await (blank === null ? q.is('full_name', null) : q.eq('full_name', ''));
        if (error) throw new Error(`profile name fill failed: ${error.message}`);
    }
}

/** Signup: create the profile if missing, then fill a blank name and phone. */
export async function registerOwner(uid: string, phone: string | null, name: string): Promise<void> {
    await provisionUser(supabaseServer, { uid, phone, name });
    await fillBlankName(uid, name);
    if (phone) await backfillProfilePhone(uid, phone);
}

/** The owner sets or changes their own name. */
export async function setOwnerName(uid: string, phone: string | null, name: string): Promise<void> {
    await provisionUser(supabaseServer, { uid, phone, name });
    const { error } = await supabaseServer
        .from('profiles')
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq('id', uid);
    if (error) throw new Error(`profile name update failed: ${error.message}`);
    if (phone) await backfillProfilePhone(uid, phone);
}

/**
 * The owner changed their sign-in number: store the new one. Unlike signup this
 * replaces the stored phone. 'taken' when another profile already holds it.
 */
export async function replaceProfilePhone(uid: string, phone: string): Promise<'ok' | 'taken'> {
    const { data: holders, error: readErr } = await supabaseServer
        .from('profiles')
        .select('id')
        .eq('phone_number', phone)
        .neq('id', uid)
        .limit(1);
    if (readErr) throw new Error(`profile phone check failed: ${readErr.message}`);
    if ((holders ?? []).length > 0) return 'taken';

    await provisionUser(supabaseServer, { uid, phone });
    const { error } = await supabaseServer
        .from('profiles')
        .update({ phone_number: phone, updated_at: new Date().toISOString() })
        .eq('id', uid);
    if (error) throw new Error(`profile phone update failed: ${error.message}`);
    return 'ok';
}

/** The profile name for a new store's `owner_name`, or null. Never throws. */
export async function ownerNameForStore(uid: string): Promise<string | null> {
    try {
        const { data, error } = await supabaseServer
            .from('profiles')
            .select('full_name')
            .eq('id', uid)
            .maybeSingle();
        if (error || !data) return null;
        const name = typeof data.full_name === 'string' ? data.full_name.trim() : '';
        return name || null;
    } catch {
        return null;
    }
}

/** Whether an E.164 number belongs to a vsite account. 'unknown' on a database error. */
export async function phoneAccountStatus(phoneE164: string): Promise<PhoneAccountStatus> {
    const { data, error } = await supabaseServer
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneE164)
        .limit(1);
    if (error) return 'unknown';
    return (data ?? []).length > 0 ? 'yes' : 'no';
}
