/**
 * "Does this number already have a vsite account?" — asked before an OTP is
 * sent, so an SMS is never spent on a number that is on the wrong page.
 *
 * Login refuses an unknown number (behind LOGIN_REQUIRES_ACCOUNT). Signup sends
 * a known number to login instead of quietly signing the owner in. If the check
 * itself fails, both pages send the OTP: a database blip must never lock an
 * owner out of their own store.
 */

export type PhoneAccountStatus = 'yes' | 'no' | 'unknown';
export type OtpPrecheck = 'send' | 'not_found' | 'already_exists';

export function otpPrecheck(
    page: 'login' | 'signup',
    status: PhoneAccountStatus,
    loginRequiresAccount: boolean,
): OtpPrecheck {
    if (page === 'login') {
        return loginRequiresAccount && status === 'no' ? 'not_found' : 'send';
    }
    return status === 'yes' ? 'already_exists' : 'send';
}

/** Asks the server. Resolves 'unknown' on any failure, never rejects. */
export async function checkPhoneAccount(phoneE164: string): Promise<PhoneAccountStatus> {
    try {
        const res = await fetch('/api/auth/phone-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phoneE164 }),
        });
        if (!res.ok) return 'unknown';
        const body = (await res.json()) as { exists?: unknown };
        return body.exists === true ? 'yes' : body.exists === false ? 'no' : 'unknown';
    } catch {
        return 'unknown';
    }
}
