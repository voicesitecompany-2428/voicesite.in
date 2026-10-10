/**
 * The one way a typed phone number becomes the E.164 form Firebase and
 * `profiles.phone_number` use. Client-safe.
 *
 * Owners type their number every way there is: with a space in the middle,
 * with +91, with 91, with a leading 0. All of them mean the same 10-digit
 * Indian mobile, which always starts 6-9.
 */
export function toIndianE164(input: string): string | null {
    let digits = input.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(digits)) return null;
    return `+91${digits}`;
}
